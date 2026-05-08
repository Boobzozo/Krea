import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, MapPin, Phone, Instagram, Facebook, Menu, X, Check, 
  ChevronRight, Settings, LogOut, Plus, Trash2, User, Info, Bell, RefreshCw,
  Image as ImageIcon, Save, AlertCircle, GripVertical, CheckCircle2, Sparkles,
  Camera
} from 'lucide-react';
import axios from 'axios';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../hooks/useToast';

// --- Types ---
interface ToastProp {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showLoading: (msg: string) => void;
  hide: () => void;
}
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category_id?: string;
  capacity?: number;
  day_of_week?: string;
  start_time?: string;
  is_group_rate?: number;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface AppSettings {
  show_gallery: string;
  show_about: string;
  admin_password?: string;
  opening_hours?: string;
  google_calendar_id?: string;
  notification_email?: string;
  hero_image?: string;
  profile_image?: string;
  discount_rules?: string;
  price_kids?: string;
  price_adults?: string;
}

interface DiscountRule {
  participants: number;
  discount: number;
}

interface GalleryImage {
  id: number;
  url: string;
  caption: string;
  created_at: string;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  [key: string]: DayHours;
}

const DAYS = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' },
];

const TimeInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [h, m] = (value || "09:00").split(':');
  
  return (
    <div className="flex items-center gap-1 bg-white border border-dark/10 rounded-lg px-2 py-1">
      <select 
        value={h} 
        onChange={(e) => onChange(`${e.target.value.padStart(2, '0')}:${m}`)}
        className="bg-transparent outline-none text-sm font-medium"
      >
        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <span className="text-gold">:</span>
      <select 
        value={m} 
        onChange={(e) => onChange(`${h}:${e.target.value.padStart(2, '0')}`)}
        className="bg-transparent outline-none text-sm font-medium"
      >
        {['00', '15', '30', '45'].map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  );
};

interface SortableGalleryItemProps {
  img: GalleryImage;
  deletingId: number | null;
  setDeletingId: (id: number | null) => void;
  deleteImage: (id: number) => void | Promise<void>;
}

const SortableGalleryItem: React.FC<SortableGalleryItemProps> = ({ img, deletingId, setDeletingId, deleteImage }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative aspect-square rounded-xl overflow-hidden group bg-white border border-dark/5 shadow-sm"
    >
      <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
      
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-white/80 rounded-lg text-dark/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical size={14} />
      </div>

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
        {deletingId === img.id ? (
          <div className="space-y-2">
            <p className="text-white text-[10px] font-bold">Confirmer ?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => deleteImage(img.id)}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={() => setDeletingId(null)}
                className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-white text-[10px] mb-2 line-clamp-2">{img.caption}</p>
            <button 
              onClick={() => setDeletingId(img.id)}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const GalleryManager = ({ toast }: { toast: ToastProp }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchGallery = async () => {
    try {
      const res = await axios.get('/api/gallery');
      setImages(res.data);
    } catch (err) {
      console.error("Error fetching gallery:", err);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 💬 FEEDBACK : Consistent toast feedback for uploads
    setIsUploading(true);
    toast.showLoading("Ajout de la photo...");
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          await axios.post('/api/gallery', { url: base64String, caption });
          setCaption('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          await fetchGallery();
          toast.showSuccess("Photo ajoutée à la galerie ✓");
        } catch (err) {
          toast.showError("Échec. Fichier trop lourd ou format invalide.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.showError("Échec. Fichier trop lourd ou format invalide.");
      setIsUploading(false);
    }
  };

  const deleteImage = async (id: number) => {
    try {
      await axios.delete(`/api/gallery/${id}`);
      setDeletingId(null);
      await fetchGallery();
      // 💬 FEEDBACK : Success toast for deletion as requested
      toast.showSuccess("Photo supprimée");
    } catch (err) {
      toast.showError("Impossible de supprimer cette photo.");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);

      const newImages = arrayMove(images, oldIndex, newIndex);
      setImages(newImages);

      // 💬 FEEDBACK : Using toast for reordering feedback instead of local pulse
      setIsSavingOrder(true);
      toast.showLoading("Mise à jour de l'ordre...");
      try {
        const orders = newImages.map((img: GalleryImage, index: number) => ({
          id: img.id,
          display_order: index + 1
        }));
        await axios.put('/api/gallery/reorder', { orders });
        toast.showSuccess("Ordre enregistré ✓");
      } catch (err) {
        toast.showError("Échec de la mise à jour de l'ordre.");
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  return (
    <div className="glass-card p-8 rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif flex items-center gap-2">
          <ImageIcon size={20} /> Gestion de la Galerie
        </h2>
      </div>
      
      <div className="mb-8 p-6 bg-white border border-dark/5 rounded-2xl space-y-4">
        <input 
          type="text" 
          placeholder="Légende de la photo"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full bg-paper border border-dark/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-gold transition-colors"
        />
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
            id="gallery-upload"
          />
          <button 
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-dark/10 cursor-pointer hover:border-gold hover:bg-gold/5 transition-all text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isUploading ? (
              <><RefreshCw size={18} className="animate-spin" /> Ajout...</>
            ) : (
              <><Plus size={18} /> Ajouter une photo</>
            )}
          </button>
        </div>
        <p className="text-[10px] text-dark/40 text-center italic">
          Astuce : Vous pouvez glisser-déposer les images pour changer leur ordre d'affichage.
        </p>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={images.map(img => img.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img) => (
              <SortableGalleryItem 
                key={img.id} 
                img={img} 
                deletingId={deletingId}
                setDeletingId={setDeletingId}
                deleteImage={deleteImage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const OpeningHoursManager = ({ settings, updateSetting, toast }: { settings: AppSettings | null, updateSetting: (key: string, value: any) => Promise<void>, toast: ToastProp }) => {
  const [hours, setHours] = useState<OpeningHours>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.opening_hours) {
      try {
        setHours(JSON.parse(settings.opening_hours));
      } catch (e) {
        console.error("Error parsing hours", e);
      }
    }
  }, [settings]);

  const handleToggleClosed = (dayId: string) => {
    const newHours = { ...hours };
    newHours[dayId] = { ...newHours[dayId], closed: !newHours[dayId].closed };
    setHours(newHours);
  };

  const handleTimeChange = (dayId: string, field: 'open' | 'close', value: string) => {
    const newHours = { ...hours };
    newHours[dayId] = { ...newHours[dayId], [field]: value };
    setHours(newHours);
  };

  const saveHours = async () => {
    // 💬 FEEDBACK : Unified toast notification for opening hours
    setIsSaving(true);
    toast.showLoading("Enregistrement des horaires...");
    try {
      await updateSetting('opening_hours', JSON.stringify(hours));
      toast.showSuccess("Horaires enregistrés ✓");
    } catch (err) {
      toast.showError("Échec de l'enregistrement. Réessayez.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 rounded-3xl">
      <h2 className="text-2xl font-serif mb-6 flex items-center gap-2">
        <Clock size={20} /> Horaires d'ouverture
      </h2>
      <div className="space-y-4 mb-8">
        {DAYS.map((day) => {
          const dayData = hours[day.id] || { open: '09:00', close: '18:00', closed: false };
          return (
            <div key={day.id} className="flex items-center justify-between p-4 bg-white border border-dark/5 rounded-2xl">
              <div className="w-24 font-medium">{day.label}</div>
              <div className="flex items-center gap-4">
                {!dayData.closed ? (
                  <div className="flex items-center gap-2">
                    <TimeInput value={dayData.open} onChange={(v) => handleTimeChange(day.id, 'open', v)} />
                    <span className="text-dark/20">—</span>
                    <TimeInput value={dayData.close} onChange={(v) => handleTimeChange(day.id, 'close', v)} />
                  </div>
                ) : (
                  <span className="text-red-500 text-sm font-medium px-4">Fermé</span>
                )}
                <button 
                  onClick={() => handleToggleClosed(day.id)}
                  className={`text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full border transition-all ${dayData.closed ? 'bg-sage/10 text-sage border-sage/20' : 'bg-dark/5 text-dark/40 border-transparent'}`}
                >
                  {dayData.closed ? 'Ouvrir' : 'Fermer'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-4">
        {/* 💬 FEEDBACK : Improved button states with RefreshCw icon when saving */}
        <button 
          onClick={saveHours} 
          disabled={isSaving}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <><RefreshCw size={18} className="animate-spin" /> Enregistrement...</>
          ) : (
            <><Save size={18} /> Enregistrer les horaires</>
          )}
        </button>
      </div>
    </div>
  );
};

const ServiceManager = ({ services, categories, fetchServices, toast }: { services: Service[], categories: Category[], fetchServices: () => Promise<void>, toast: ToastProp }) => {
  const [editingServices, setEditingServices] = useState<Service[]>(services);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditingServices(services);
  }, [services]);

  const handleAdd = () => {
    setEditingServices([...editingServices, { id: '', name: 'Nouvel atelier', price: 0, duration: 60, category_id: categories[0]?.id, capacity: 8 }]);
  };

  const handleChange = (index: number, field: keyof Service, value: any) => {
    const next = [...editingServices];
    next[index] = { ...next[index], [field]: value };
    setEditingServices(next);
  };

  const handleRemove = (index: number) => {
    setEditingServices(editingServices.filter((_, i) => i !== index));
  };

  const save = async () => {
    // 💬 FEEDBACK : Unified toast for services with button loading state
    setIsSaving(true);
    toast.showLoading("Mise à jour des ateliers...");
    try {
      await axios.post('/api/services', editingServices);
      toast.showSuccess("Ateliers mis à jour ✓");
      await fetchServices();
    } catch (err) {
      toast.showError("Échec. Vérifiez les données.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 rounded-3xl col-span-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif flex items-center gap-2">
          <Settings size={20} /> Gestion des Ateliers
        </h2>
        <button onClick={handleAdd} className="btn-outline flex items-center gap-2 text-sm">
          <Plus size={16} /> Ajouter un atelier
        </button>
      </div>
      <div className="grid gap-4 mb-8">
        {editingServices.map((s, i) => (
          <div key={i} className="p-6 bg-white border border-dark/5 rounded-2xl grid md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Nom de l'atelier</label>
              <input 
                value={s.name} 
                onChange={(e) => handleChange(i, 'name', e.target.value)}
                className="w-full bg-paper border border-dark/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Prix (€)</label>
              <input 
                type="number"
                value={s.price} 
                onChange={(e) => handleChange(i, 'price', parseFloat(e.target.value))}
                className="w-full bg-paper border border-dark/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Durée (min)</label>
              <input 
                type="number"
                value={s.duration} 
                onChange={(e) => handleChange(i, 'duration', parseInt(e.target.value))}
                className="w-full bg-paper border border-dark/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Jour (Récurrent)</label>
              <select 
                value={s.day_of_week || ''} 
                onChange={(e) => handleChange(i, 'day_of_week', e.target.value)}
                className="w-full bg-paper border border-dark/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
              >
                <option value="">Ponctuel</option>
                {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Heure début</label>
              <input 
                type="time"
                value={s.start_time || ''} 
                onChange={(e) => handleChange(i, 'start_time', e.target.value)}
                className="w-full bg-paper border border-dark/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="flex items-center gap-4 md:col-span-3 xl:col-span-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Catégorie</label>
                <select 
                  value={s.category_id} 
                  onChange={(e) => handleChange(i, 'category_id', e.target.value)}
                  className="w-full bg-paper border border-dark/5 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold cursor-pointer"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 flex flex-col items-center">
                <label className="text-[10px] uppercase tracking-widest font-bold text-dark/40">Tarif dégressif</label>
                <button 
                  onClick={() => handleChange(i, 'is_group_rate', s.is_group_rate ? 0 : 1)}
                  className={`p-2 rounded-lg transition-all ${s.is_group_rate ? 'bg-gold/20 text-gold' : 'bg-dark/5 text-dark/20'}`}
                  title={s.is_group_rate ? "Réduction groupe active" : "Réduction groupe inactive"}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
              <button onClick={() => handleRemove(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-1">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button 
        onClick={save} 
        disabled={isSaving}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <><RefreshCw size={18} className="animate-spin" /> Enregistrement...</>
        ) : (
          <><Save size={18} /> Enregistrer les ateliers</>
        )}
      </button>
    </div>
  );
};

const MainPhotosManager = ({ settings, updateSetting, toast }: { settings: AppSettings | null, updateSetting: (key: string, value: any) => Promise<void>, toast: ToastProp }) => {
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (key: 'hero_image' | 'profile_image', file: File) => {
    // 💬 FEEDBACK : Individual toast and loading state per image
    if (key === 'hero_image') setIsSavingHero(true);
    else setIsSavingProfile(true);

    toast.showLoading("Upload de la photo en cours...");

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateSetting(key, reader.result as string);
        toast.showSuccess("Photo mise à jour ✓");
      } catch (err) {
        toast.showError("Échec de l'upload. Vérifiez le fichier.");
      } finally {
        setIsSavingHero(false);
        setIsSavingProfile(false);
      }
    };
    reader.onerror = () => {
      toast.showError("Erreur lors de la lecture du fichier.");
      setIsSavingHero(false);
      setIsSavingProfile(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="glass-card p-8 rounded-3xl col-span-full">
      <h2 className="text-2xl font-serif mb-6 flex items-center gap-2">
        <ImageIcon size={20} /> Photos Principales du Site
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Hero Image */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold text-dark/40">Image d'accueil (Hero)</label>
          <div className="aspect-video rounded-2xl overflow-hidden bg-dark/5 relative group">
            <img 
              src={settings?.hero_image} 
              className="w-full h-full object-cover" 
              alt="Hero Preview"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => heroInputRef.current?.click()}
                disabled={isSavingHero}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-2 disabled:opacity-70"
              >
                {isSavingHero ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                {isSavingHero ? "Envoi..." : "Changer l'image"}
              </button>
            </div>
          </div>
          <input 
            type="file" 
            ref={heroInputRef} 
            className="hidden" 
            onChange={(e) => e.target.files?.[0] && handleUpload('hero_image', e.target.files[0])}
          />
        </div>

        {/* Profile Image */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold text-dark/40">Photo de profil (Univers)</label>
          <div className="aspect-[4/5] h-48 rounded-2xl overflow-hidden bg-dark/5 relative group mx-auto">
            <img 
              src={settings?.profile_image} 
              className="w-full h-full object-cover" 
              alt="Profile Preview"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => profileInputRef.current?.click()}
                disabled={isSavingProfile}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-2 disabled:opacity-70"
              >
                {isSavingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                {isSavingProfile ? "Envoi..." : "Changer la photo"}
              </button>
            </div>
          </div>
          <input 
            type="file" 
            ref={profileInputRef} 
            className="hidden" 
            onChange={(e) => e.target.files?.[0] && handleUpload('profile_image', e.target.files[0])}
          />
        </div>
      </div>
    </div>
  );
};

const DiscountManager = ({ settings, updateSetting, toast }: { settings: AppSettings | null, updateSetting: (key: string, value: any) => Promise<void>, toast: ToastProp }) => {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.discount_rules) {
      try {
        setRules(JSON.parse(settings.discount_rules));
      } catch (e) {
        console.error("Error parsing rules", e);
      }
    }
  }, [settings]);

  const handleAdd = () => {
    setRules([...rules, { participants: rules.length + 2, discount: 5 * (rules.length + 1) }]);
  };

  const handleChange = (index: number, field: keyof DiscountRule, value: number) => {
    const next = [...rules];
    next[index] = { ...next[index], [field]: value };
    setRules(next.sort((a, b) => a.participants - b.participants));
  };

  const handleRemove = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const save = async () => {
    // 💬 FEEDBACK : Unified toast for discounts logic
    setIsSaving(true);
    toast.showLoading("Enregistrement des réductions...");
    try {
      await updateSetting('discount_rules', JSON.stringify(rules));
      toast.showSuccess("Réductions enregistrées ✓");
    } catch (err) {
      toast.showError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 rounded-3xl">
      <h2 className="text-2xl font-serif mb-6 flex items-center gap-2">
        <Sparkles size={20} className="text-leaf" /> Tarifs Dégressifs
      </h2>
      <p className="text-sm text-dark/40 mb-6 font-sans">
        Définissez le pourcentage de réduction appliqué au prix total selon le nombre de participants.
      </p>
      
      <div className="space-y-3 mb-8">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white border border-dark/5 rounded-2xl">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-bold text-dark/40">À partir de</span>
              <input 
                type="number" 
                value={rule.participants}
                onChange={(e) => handleChange(i, 'participants', parseInt(e.target.value))}
                className="w-16 bg-paper border border-dark/5 rounded-lg px-2 py-1 text-center font-bold"
              />
              <span className="text-sm font-bold text-dark/40">personnes</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={rule.discount}
                onChange={(e) => handleChange(i, 'discount', parseInt(e.target.value))}
                className="w-16 bg-paper border border-dark/5 rounded-lg px-2 py-1 text-center font-bold text-leaf"
              />
              <span className="font-bold text-leaf">%</span>
            </div>
            <button onClick={() => handleRemove(i)} className="text-red-400 hover:text-red-600 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-8 text-dark/20 text-sm border-2 border-dashed border-dark/5 rounded-2xl">
            Aucune règle de réduction active.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <button onClick={handleAdd} className="btn-outline flex items-center justify-center gap-2 text-sm py-2">
          <Plus size={16} /> Ajouter un palier
        </button>
        {/* 💬 FEEDBACK : Unified save button with loading spinner */}
        <button 
          onClick={save} 
          disabled={isSaving}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <><RefreshCw size={18} className="animate-spin" /> Enregistrement...</>
          ) : (
            <><Save size={18} /> Enregistrer les réductions</>
          )}
        </button>
      </div>
    </div>
  );
};

const ReservationManager = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await axios.get('/api/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="glass-card p-8 rounded-3xl col-span-full">
      <h2 className="text-2xl font-serif mb-6 flex items-center gap-2">
        <Calendar size={20} /> Réservations Récentes
      </h2>
      
      {loading ? (
        <div className="text-center py-12 text-dark/40">Chargement...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-dark/40 bg-white/50 rounded-2xl border border-dashed border-dark/10">
          Aucune réservation pour aujourd'hui.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest font-bold text-dark/40 border-b border-dark/5">
                <th className="pb-4 pt-0">Ref</th>
                <th className="pb-4 pt-0">Date & Heure</th>
                <th className="pb-4 pt-0">Client</th>
                <th className="pb-4 pt-0">Atelier</th>
                <th className="pb-4 pt-0">Participants</th>
                <th className="pb-4 pt-0">Prix</th>
                <th className="pb-4 pt-0">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-dark/5 last:border-0">
                  <td className="py-4 font-mono text-[10px] text-dark/40">{b.reservation_id || '-'}</td>
                  <td className="py-4">
                    <div className="font-bold">{new Date(b.start_time).toLocaleDateString('fr-FR')}</div>
                    <div className="text-[10px] text-dark/40">{new Date(b.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="py-4">
                    <div className="font-bold">{b.customer_name}</div>
                    <div className="text-[10px] text-dark/40">{b.customer_email}</div>
                  </td>
                  <td className="py-4 font-medium">{b.service_type}</td>
                  <td className="py-4 text-center">{b.participants || 1}</td>
                  <td className="py-4 font-bold text-gold">{b.total_price ? `${b.total_price}€` : '-'}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${b.status === 'confirmed' ? 'bg-sage/10 text-sage' : 'bg-red-50 text-red-500'}`}>
                      {b.status === 'confirmed' ? 'Confirmé' : 'Annulé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = ({ 
  onLogout, 
  onPreview,
  settings, 
  updateSetting,
  updateSettings,
  services,
  fetchServices,
  categories,
  fetchCategories
}: { 
  onLogout: () => void, 
  onPreview: () => void,
  settings: AppSettings | null, 
  updateSetting: (key: string, value: any) => Promise<void>,
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>,
  services: Service[],
  fetchServices: () => Promise<void>,
  categories: Category[],
  fetchCategories: () => Promise<void>
}) => {
  // 💬 FEEDBACK : Centralized toast management
  const { showSuccess, showError, showLoading, hide, ToastComponent } = useToast();
  const toast = { showSuccess, showError, showLoading, hide };

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-serif mb-2">Tableau de Bord Admin</h1>
          <p className="text-dark/40">Gérez votre atelier, vos réservations et votre galerie.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onPreview} className="btn-primary flex items-center gap-2 bg-leaf hover:bg-forest">
            <User size={16} /> Voir le site en direct
          </button>
          <button onClick={onLogout} className="btn-outline flex items-center gap-2">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <ReservationManager />
        <DiscountManager settings={settings} updateSetting={updateSetting} toast={toast} />
        <MainPhotosManager settings={settings} updateSetting={updateSetting} toast={toast} />
        <OpeningHoursManager settings={settings} updateSetting={updateSetting} toast={toast} />
        <GalleryManager toast={toast} />
        <ServiceManager services={services} categories={categories} fetchServices={fetchServices} toast={toast} />
      </div>
      
      <div className="mt-12 p-8 glass-card rounded-3xl text-center border border-leaf/10">
        <div className="flex items-center justify-center gap-2 text-leaf mb-4">
          <AlertCircle size={20} />
          <span className="font-serif text-xl">Conseil de gestion</span>
        </div>
        <p className="text-dark/60 max-w-2xl mx-auto">
          Pensez à mettre à jour régulièrement votre galerie pour montrer vos dernières créations. 
          Les nouveaux ateliers s'affichent automatiquement dans le calendrier de réservation.
        </p>
      </div>

      {/* 💬 FEEDBACK : Toast component placed at the end of JSX */}
      {ToastComponent}
    </div>
  );
};

export default AdminDashboard;
