import React, { useState, useEffect, Component, ReactNode } from 'react';
import { DEFAULT_LOGO } from './constants';
import { 
  Reservation, 
  ReservationType, 
  ReservationStatus, 
  TouristSite,
  ServiceItem,
  ReviewItem 
} from './types';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  Plane, 
  Car, 
  Key, 
  MessageCircle, 
  Settings, 
  CheckCircle2, 
  X, 
  Star, 
  Phone, 
  Mail, 
  Clock,
  AlertTriangle,
  Search,
  ChevronRight,
  Menu,
  Facebook,
  Music2,
  Camera,
  Upload,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Error Handling ---

const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback to original if error
  });
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show alert for write failures so user knows it didn't save
  if (operationType === OperationType.WRITE || operationType === OperationType.UPDATE || operationType === OperationType.DELETE) {
    alert("Erreur lors de l'enregistrement : " + errInfo.error + "\nVérifiez votre connexion ou vos permissions.");
  }
  
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends (Component as any) {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    const state = this.state as any;
    if (state.hasError) {
      let errorMessage = "Une erreur est survenue.";
      try {
        const parsed = JSON.parse(state.error?.message || "");
        if (parsed.error && parsed.error.includes("permissions")) {
          errorMessage = "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
          <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 max-w-md w-full">
            <AlertTriangle className="w-12 h-12 text-gold mx-auto mb-4" />
            <h2 className="text-xl font-serif text-white mb-2">Oups !</h2>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gold text-black rounded-xl font-medium"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

// --- Components ---

const Logo = ({ className = "", src = null }: { className?: string, src?: string | null }) => {
  const displaySrc = src || DEFAULT_LOGO;
  
  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        {displaySrc && displaySrc.length > 10 ? (
          <img src={displaySrc} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <>
            {/* Outer Circle / Steering Wheel */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-gold fill-none stroke-gold stroke-[2.5]">
              <circle cx="50" cy="50" r="46" />
              {/* Steering wheel spokes at the bottom */}
              <path d="M50 75 L50 96" strokeLinecap="round" />
              <path d="M30 85 L15 92" strokeLinecap="round" />
              <path d="M70 85 L85 92" strokeLinecap="round" />
            </svg>
            {/* Woman Profile Silhouette */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full fill-gold p-3">
              <path d="M55,25 C45,25 35,35 35,50 C35,60 40,70 50,75 C52,76 55,72 55,70 C55,68 53,65 50,62 C45,58 42,50 45,40 C48,30 55,28 60,30 C65,32 68,40 65,50 C63,60 58,65 55,70 C55,75 60,80 65,75 C75,65 80,50 75,35 C70,25 65,25 55,25 Z" />
              {/* Refined profile line */}
              <path d="M58,35 C52,35 48,40 48,48 C48,55 52,60 55,62 L55,68 C52,68 50,65 48,62 C45,58 43,52 45,45 C47,38 52,35 58,35 Z" fill="black" opacity="0.2" />
            </svg>
          </>
        )}
      </div>
      <div className="flex flex-col" translate="no">
        <span className="font-serif text-2xl font-light text-gold tracking-widest leading-none">
          Elle<span className="italic text-white">Drives</span>
        </span>
        <span className="text-[8px] text-gold/50 uppercase tracking-[0.3em] mt-1">Conduite au Féminin</span>
      </div>
    </div>
  );
};

const Navbar = ({ onOpenAdmin, onOpenTrack, logo }: { onOpenAdmin: () => void, onOpenTrack: () => void, logo: string | null }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'services', label: 'Services' },
    { id: 'tourisme', label: 'Tourisme' },
    { id: 'tarifs', label: 'Tarifs' },
    { id: 'apropos', label: 'À Propos' },
    { id: 'avis', label: 'Avis' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 md:px-16 transition-all duration-500 ${isScrolled ? 'bg-dark/95 backdrop-blur-md border-b border-gold/20' : 'bg-transparent'}`}>
      <a href="#" className="group">
        <Logo src={logo} />
      </a>
      
      <div className="hidden md:flex items-center gap-10">
        {navItems.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="text-[11px] font-medium tracking-widest uppercase text-white/70 hover:text-gold transition-colors">
            {item.label}
          </a>
        ))}
        <button 
          onClick={onOpenTrack}
          className="text-[11px] font-medium tracking-widest uppercase text-white/70 hover:text-gold transition-colors"
        >
          Suivi
        </button>
        <a href="#reservation" className="bg-gold text-dark px-6 py-2 text-[11px] font-bold tracking-widest uppercase rounded-sm hover:bg-gold-light transition-colors">
          Réserver
        </a>
      </div>

      <button 
        onClick={onOpenAdmin}
        className="flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold px-4 py-2 rounded-sm text-[10px] tracking-widest uppercase hover:bg-gold/20 transition-all"
      >
        <Settings size={14} />
        <span className="hidden sm:inline">Admin</span>
      </button>
    </nav>
  );
};

const Hero = ({ image, title, subtitle }: { image: string, title: string, subtitle: string }) => (
  <section className="relative min-h-screen bg-dark flex items-center overflow-hidden">
    {/* Background Image - Baobab */}
    <div className="absolute inset-0 z-0">
      <img 
        src={image} 
        alt="Baobab Sénégal" 
        className="w-full h-full object-cover opacity-60"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/70 to-transparent" />
      <div className="absolute inset-0 bg-black/40" />
    </div>

    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_70%_50%,rgba(201,168,76,0.08)_0%,transparent_60%),radial-gradient(ellipse_40%_60%_at_20%_80%,rgba(201,168,76,0.05)_0%,transparent_50%)]" />
    
    <div className="relative z-10 section-padding pt-32 md:pt-40 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold text-[10px] tracking-[0.2em] uppercase px-4 py-1.5 rounded-full mb-8"
      >
        {subtitle}
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="font-serif text-5xl md:text-8xl font-light text-white leading-[1.1] mb-8 whitespace-pre-line"
      >
        {title.split('\n').map((line, i) => (
          <span key={i}>
            {line.includes('relation') ? (
              <>
                {line.split('relation')[0]}
                <em className="italic text-gold">relation</em>
                {line.split('relation')[1]}
              </>
            ) : line}
            <br />
          </span>
        ))}
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="text-white/60 text-lg leading-relaxed max-w-lg mb-10"
      >
        Transport premium, transferts aéroport et location de véhicules au Sénégal. 
        Conduit par des femmes passionnées. Ponctuel, sécurisé, sans frais cachés.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="flex flex-wrap gap-4"
      >
        <a href="#reservation" className="btn-primary">Réserver maintenant</a>
        <a href="#services" className="btn-outline">Nos services</a>
      </motion.div>
    </div>

    <div className="hidden lg:flex absolute bottom-12 right-16 gap-12">
      {[
        { label: 'Trajets effectués', value: '500+' },
        { label: 'Note moyenne', value: '4.9★' },
        { label: 'Disponible', value: '24/7' }
      ].map((stat, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 + i * 0.1 }}
          className="text-center"
        >
          <span className="block font-serif text-4xl text-gold font-light mb-1">{stat.value}</span>
          <span className="text-[10px] text-white/40 tracking-widest uppercase">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  </section>
);

const Services = ({ items }: { items: ServiceItem[] }) => (
  <section id="services" className="section-padding bg-cream">
    <span className="block text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Ce que nous offrons</span>
    <h2 className="font-serif text-4xl md:text-6xl font-light text-dark leading-tight mb-16">
      Nos services,<br />à votre mesure.
    </h2>

    <div className="grid md:grid-cols-3 gap-px bg-gold/15 border border-gold/15">
      {items.map((s, i) => (
        <div key={i} className="group bg-white p-10 transition-all duration-500 hover:bg-dark hover:-translate-y-1">
          <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mb-8 group-hover:bg-gold/20 transition-colors">
            {s.icon === 'plane' ? <Plane className="text-gold" /> : s.icon === 'clock' ? <Clock className="text-gold" /> : <Key className="text-gold" />}
          </div>
          <h3 className="font-serif text-2xl text-dark mb-4 group-hover:text-gold transition-colors">{s.title}</h3>
          <p className="text-ink-muted text-sm leading-relaxed mb-8 group-hover:text-white/60 transition-colors">{s.desc}</p>
          <span className="font-serif text-lg font-semibold text-gold group-hover:text-gold-light transition-colors">{s.price}</span>
        </div>
      ))}
    </div>
  </section>
);

const Reviews = ({ items }: { items: ReviewItem[] }) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState(items);

  useEffect(() => {
    setFeedbacks(items);
  }, [items]);

  const handleAddFeedback = (newFeedback: any) => {
    setFeedbacks([newFeedback, ...feedbacks]);
    setIsFeedbackOpen(false);
  };

  return (
    <section id="avis" className="section-padding bg-cream">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
        <div>
          <span className="block text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Ce qu'ils disent</span>
          <h2 className="font-serif text-4xl md:text-6xl font-light text-dark leading-tight">
            Nos clients<br />parlent pour nous.
          </h2>
        </div>
        <button 
          onClick={() => setIsFeedbackOpen(true)}
          className="btn-outline border-dark text-dark hover:bg-dark hover:text-white"
        >
          Laisser un avis →
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {feedbacks.map((r, i) => (
          <div key={i} className="bg-white border border-gold/15 p-8 rounded-sm hover:-translate-y-1 transition-transform">
            <div className="flex text-gold gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < (r.rating || 5) ? "currentColor" : "none"} />
              ))}
            </div>
            <p className="text-ink italic text-sm leading-relaxed mb-8">"{r.text}"</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-light rounded-full flex items-center justify-center font-bold text-dark text-xs">
                {r.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-medium text-dark">{r.name}</div>
                <div className="text-[10px] text-ink-muted uppercase tracking-wider">{r.meta}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isFeedbackOpen && (
          <FeedbackModal 
            onClose={() => setIsFeedbackOpen(false)} 
            onSubmit={handleAddFeedback}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

const FeedbackModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) => {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [meta, setMeta] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, meta, text, rating });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-dark/95 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white max-w-lg w-full p-10 rounded-sm relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-dark/30 hover:text-dark">✕</button>
        <h3 className="font-serif text-3xl text-dark mb-2">Votre avis</h3>
        <p className="text-ink-muted text-sm mb-8">Partagez votre expérience avec <span translate="no">ElleDrives</span>.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button 
                key={s} 
                type="button"
                onClick={() => setRating(s)}
                className={`text-gold transition-transform hover:scale-110 ${rating >= s ? 'opacity-100' : 'opacity-30'}`}
              >
                <Star size={24} fill={rating >= s ? "currentColor" : "none"} />
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-ink-muted">Nom complet</label>
            <input 
              required 
              type="text" 
              className="w-full bg-dark/5 border border-dark/10 p-3 text-sm focus:border-gold outline-none transition-colors"
              placeholder="Ex: Aminata Diallo"
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-ink-muted">Trajet ou Service</label>
            <input 
              required 
              type="text" 
              className="w-full bg-dark/5 border border-dark/10 p-3 text-sm focus:border-gold outline-none transition-colors"
              placeholder="Ex: Transfert Aéroport"
              onChange={e => setMeta(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-ink-muted">Votre commentaire</label>
            <textarea 
              required 
              rows={4}
              className="w-full bg-dark/5 border border-dark/10 p-3 text-sm focus:border-gold outline-none transition-colors resize-none"
              placeholder="Racontez-nous votre trajet..."
              onChange={e => setText(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full bg-dark text-white hover:bg-dark/90">
            Publier mon avis →
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const TouristSites = ({ sites }: { sites: TouristSite[] }) => (
  <section id="tourisme" className="section-padding bg-dark">
    <div className="mb-16">
      <span className="block text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Découvrez le Sénégal</span>
      <h2 className="font-serif text-4xl md:text-6xl font-light text-white leading-tight">
        Nos sites <br /><em className="italic text-gold">incontournables</em>.
      </h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sites.map((site, i) => (
        <motion.div 
          key={site.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="group relative overflow-hidden rounded-sm aspect-[4/5]"
        >
          <img 
            src={site.img} 
            alt={site.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8">
            <h3 className="font-serif text-2xl text-white mb-2">{site.title}</h3>
            <p className="text-white/60 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {site.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

const Footer = ({ tiktokName, logo }: { tiktokName: string, logo: string | null }) => {
  const displayLogo = logo || (DEFAULT_LOGO.length > 100 ? DEFAULT_LOGO : null);
  
  return (
    <footer className="bg-[#080604] section-padding py-10 border-t border-gold/10 flex flex-col md:flex-row items-center justify-between gap-8">
      {displayLogo ? (
        <img src={displayLogo} alt="Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
      ) : (
        <Logo className="scale-75 origin-left" />
      )}
      <div className="text-[11px] text-white/20 tracking-wider">
        © 2025 <span translate="no">ElleDrives</span> · Dakar, Sénégal · Tous droits réservés
      </div>
      <div className="flex gap-4">
        <a href="https://www.facebook.com/share/1BEHgAMwgr/?mibextid=wwXlfr" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:border-gold hover:text-gold transition-all">
          <Facebook size={16} />
        </a>
        <a href={`https://www.tiktok.com/@${tiktokName.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:border-gold hover:text-gold transition-all">
          <Music2 size={16} />
        </a>
        <a href="https://wa.me/221766385938" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:border-gold hover:text-gold transition-all">
          <MessageCircle size={16} />
        </a>
      </div>
    </footer>
  );
};

// --- Main App ---

const DEFAULT_PRICES = {
  transfert: {
    dakarCentre: 30000,
    dakarCentreSUV: 15000,
    almadies: 35000,
    almadiesSUV: 15000,
    diamniadio: 20000,
    diamniadioSUV: 10000,
    saly: 35000,
    salySUV: 20000,
    bandia: 35000,
    bandiaSUV: 15000,
    lompoul: 60000,
    lompoulSUV: 20000,
    thies: 30000,
    thiesSUV: 15000,
    saintLouis: 70000,
    saintLouisSUV: 25000,
    louga: 65000,
    lougaSUV: 20000,
    kaolack: 60000,
    kaolackSUV: 20000,
    somone: 40000,
    somoneSUV: 15000,
    lacRose: 25000,
    lacRoseSUV: 10000,
    saloum: 75000,
    saloumSUV: 25000,
    touba: 70000,
    toubaSUV: 25000,
    tivaouane: 45000,
    tivaouaneSUV: 15000
  },
  dispo: {
    demiJournee: 40000,
    journee: 70000
  },
  location: {
    berline: 30000,
    suv: 50000,
    luxe: 100000
  },
  bouquets: {
    small: 15000,
    medium: 25000,
    large: 30000
  }
};

const DEFAULT_SERVICES: ServiceItem[] = [
  { 
    id: '1',
    icon: 'plane', 
    title: 'Transfert Aéroport', 
    desc: 'Accueil personnalisé avec pancarte à l\'AIBD. Suivi de vol en temps réel — pas de supplément en cas de retard.',
    price: 'À partir de 20 000 FCFA'
  },
  { 
    id: '2',
    icon: 'clock', 
    title: 'Mise à Disposition', 
    desc: 'Un véhicule avec chauffeuse à votre service pour vos courses ou événements. Demi-journée ou journée complète.',
    price: 'À partir de 40 000 FCFA / 4h'
  },
  { 
    id: '3',
    icon: 'key', 
    title: 'Location de Voiture', 
    desc: 'Berlines, SUV et véhicules prestige à la location journalière. Flotte entretenue avec soin. Caution requise.',
    price: 'À partir de 30 000 FCFA / jour'
  }
];

const DEFAULT_REVIEWS: ReviewItem[] = [
  { id: '1', name: 'Aminata M.', meta: 'Paris → Dakar', text: "Service impeccable ! Khady était à l'heure, le véhicule était propre et climatisé. La pancarte à l'aéroport, c'est le top.", rating: 5 },
  { id: '2', name: 'Jean-Luc D.', meta: 'Touriste', text: "J'ai loué un SUV pour un road trip vers Saly. Tout était parfait : voiture en excellent état, contrat clair. Une vraie professionnelle !", rating: 5 },
  { id: '3', name: 'Fatou K.', meta: 'Diaspora', text: "Mon vol avait 2h de retard et Khady était toujours là, souriante. Elle m'avait envoyer un message pour me dire qu'elle suivait mon vol.", rating: 5 }
];

const DEFAULT_TOURIST_SITES: TouristSite[] = [
  {
    id: 'goree',
    title: 'Île de Gorée',
    desc: 'Un lieu chargé d\'histoire et d\'émotion, classé au patrimoine mondial de l\'UNESCO. Ses ruelles colorées et la Maison des Esclaves sont incontournables.',
    img: 'https://images.unsplash.com/photo-1599733589046-9b8308b5b50d?auto=format&fit=crop&q=80',
    order: 0
  },
  {
    id: 'lac-rose',
    title: 'Lac Rose',
    desc: 'Célèbre pour sa couleur unique et sa forte salinité. Un paysage lunaire où les ramasseurs de sel s\'activent dans une ambiance hors du temps.',
    img: 'https://images.unsplash.com/photo-1523438097201-512ae7d59c44?auto=format&fit=crop&q=80',
    order: 1
  },
  {
    id: 'bandia',
    title: 'Réserve de Bandia',
    desc: 'Un safari authentique à quelques kilomètres de Dakar. Observez girafes, rhinocéros, zèbres et antilopes dans leur habitat naturel.',
    img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80',
    order: 2
  }
];

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showModal, setShowModal] = useState<Reservation | null>(null);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [founderPhoto, setFounderPhoto] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string>('https://pepiniere.sn/wp-content/uploads/2025/03/baobab.webp');
  const [heroTitle, setHeroTitle] = useState<string>("Plus qu'un trajet,\nune relation\nde confiance.");
  const [heroSubtitle, setHeroSubtitle] = useState<string>("🇸🇳 Service Premium — Dakar & Environs");
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS);
  const [tiktokName, setTiktokName] = useState('EllesDrives');
  const [touristSites, setTouristSites] = useState<TouristSite[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Update favicon when logo changes
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      if (logo) {
        link.href = logo;
      } else if (DEFAULT_LOGO && DEFAULT_LOGO.length > 100) {
        link.href = DEFAULT_LOGO;
      } else {
        // Fallback to default favicon if no logo is set
        link.href = '/favicon.svg';
      }
    }
  }, [logo]);

  // Sync Settings from Firestore
  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.prices) setPrices(data.prices);
        setHeroTitle(data.heroTitle || "Plus qu'un trajet,\nune relation\nde confiance.");
        setHeroSubtitle(data.heroSubtitle || "🇸🇳 Service Premium — Dakar & Environs");
        if (data.services) setServices(data.services);
        if (data.reviews) setReviews(data.reviews);
        setTiktokName(data.tiktokName || 'EllesDrives');
      } else {
        // Initialize global settings if they don't exist
        const initialSettings = {
          prices: DEFAULT_PRICES,
          services: DEFAULT_SERVICES,
          reviews: DEFAULT_REVIEWS,
          heroTitle: "Plus qu'un trajet,\nune relation\nde confiance.",
          heroSubtitle: "🇸🇳 Service Premium — Dakar & Environs",
          tiktokName: 'EllesDrives'
        };
        setDoc(doc(db, 'settings', 'global'), initialSettings).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, 'settings/global');
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    const unsubBranding = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('Branding loaded:', { hasLogo: !!data.logo, hasPhoto: !!data.founderPhoto });
        setLogo(data.logo || null);
        setFounderPhoto(data.founderPhoto || null);
      } else if (user && user.email === 'dioufkhady28@gmail.com') {
        console.log('Initializing branding settings...');
        setDoc(doc(db, 'settings', 'branding'), { logo: null, founderPhoto: null }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/branding'));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/branding');
    });

    const unsubHero = onSnapshot(doc(db, 'settings', 'hero'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('Hero loaded:', { hasHero: !!data.heroImage });
        setHeroImage(data.heroImage || 'https://pepiniere.sn/wp-content/uploads/2025/03/baobab.webp');
      } else if (user && user.email === 'dioufkhady28@gmail.com') {
        console.log('Initializing hero settings...');
        setDoc(doc(db, 'settings', 'hero'), { heroImage: 'https://pepiniere.sn/wp-content/uploads/2025/03/baobab.webp' }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/hero'));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/hero');
    });

    return () => {
      unsubGlobal();
      unsubBranding();
      unsubHero();
    };
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'tourisme'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log('Tourist sites collection is empty.');
        if (user && user.email === 'dioufkhady28@gmail.com') {
          console.log('Seeding default tourist sites...');
          const batch = writeBatch(db);
          DEFAULT_TOURIST_SITES.forEach(site => {
            batch.set(doc(db, 'tourisme', site.id), site);
          });
          batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'tourisme'));
        } else {
          // If not admin and empty, show defaults locally so page doesn't look broken
          setTouristSites(DEFAULT_TOURIST_SITES);
          return;
        }
      }
      
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as TouristSite[];
      
      if (docs.length > 0) {
        setTouristSites(docs);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tourisme');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setReservations([]);
      return;
    }
    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Reservation[];
      setReservations(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reservations');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successId = params.get('id');
    
    const checkSuccess = async () => {
      if (window.location.pathname === '/reservation-success' && successId) {
        // Try to find in local state first
        let res = reservations.find(r => r.id === successId);
        
        // If not found (e.g. not admin), fetch directly
        if (!res) {
          try {
            const docRef = doc(db, 'reservations', successId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              res = { id: docSnap.id, ...docSnap.data() } as Reservation;
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `reservations/${successId}`);
          }
        }
        
        if (res) setShowModal(res);
        window.history.replaceState({}, '', '/');
      }
    };

    checkSuccess();

    if (window.location.pathname === '/reservation-error') {
      alert("Le paiement Wave a échoué ou a été annulé. Veuillez réessayer.");
      window.history.replaceState({}, '', '/');
    }
  }, [reservations, window.location.search]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      alert("Erreur de connexion : " + err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveReservations = async (updated: Reservation[]) => {
    // In a real app, we'd update individual docs. 
    // For this dashboard, we'll just update the one that changed if we knew which one.
    // But since AdminDashboard passes the whole list, we'll assume it's for local state
    // and individual updates happen via onUpdate callback in AdminDashboard.
    setReservations(updated);
  };

  const handleUpdateReservation = async (res: Reservation) => {
    try {
      await updateDoc(doc(db, 'reservations', res.id), { ...res });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservations/${res.id}`);
    }
  };

  const handleCancelReservation = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { statut: 'cancelled' });
      const updated = reservations.find(r => r.id === id);
      if (updated) setShowModal({ ...updated, statut: 'cancelled' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleUpdatePrices = async (newPrices: typeof DEFAULT_PRICES) => {
    setPrices(newPrices);
    try {
      await setDoc(doc(db, 'settings', 'global'), { prices: newPrices }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleUpdatePhoto = async (photo: string) => {
    setFounderPhoto(photo);
    try {
      await setDoc(doc(db, 'settings', 'branding'), { founderPhoto: photo }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/branding');
    }
  };

  const handleUpdateLogo = async (newLogo: string) => {
    setLogo(newLogo);
    try {
      await setDoc(doc(db, 'settings', 'branding'), { logo: newLogo }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/branding');
    }
  };

  const handleUpdateHero = async (newHero: string) => {
    setHeroImage(newHero);
    try {
      await setDoc(doc(db, 'settings', 'hero'), { heroImage: newHero }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/hero');
    }
  };

  const handleUpdateHeroText = async (title: string, subtitle: string) => {
    setHeroTitle(title);
    setHeroSubtitle(subtitle);
    try {
      await setDoc(doc(db, 'settings', 'global'), { heroTitle: title, heroSubtitle: subtitle }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleUpdateServices = async (newServices: ServiceItem[]) => {
    setServices(newServices);
    try {
      await setDoc(doc(db, 'settings', 'global'), { services: newServices }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleUpdateReviews = async (newReviews: ReviewItem[]) => {
    setReviews(newReviews);
    try {
      await setDoc(doc(db, 'settings', 'global'), { reviews: newReviews }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleUpdateTiktok = async (name: string) => {
    setTiktokName(name);
    try {
      await setDoc(doc(db, 'settings', 'global'), { tiktokName: name }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleUpdateAllReservations = async (allReservations: Reservation[]) => {
    setReservations(allReservations);
    try {
      const batch = writeBatch(db);
      for (const res of allReservations) {
        batch.set(doc(db, 'reservations', res.id), res);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reservations_batch');
    }
  };

  const handleUpdateTouristSites = async (sites: TouristSite[]) => {
    // Optimistic update
    setTouristSites(sites);

    try {
      const q = query(collection(db, 'tourisme'));
      const snapshot = await getDocs(q);
      const existingIds = snapshot.docs.map(d => d.id);
      const newIds = sites.map(s => s.id);

      const batch = writeBatch(db);

      // Delete removed sites
      for (const id of existingIds) {
        if (!newIds.includes(id)) {
          batch.delete(doc(db, 'tourisme', id));
        }
      }

      // Update/Add sites
      for (const site of sites) {
        batch.set(doc(db, 'tourisme', site.id), site);
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tourisme');
    }
  };

  const handleBooking = async (data: Partial<Reservation>) => {
    const id = 'ED-' + Math.floor(1000 + Math.random() * 9000);
    const newRes: Reservation = {
      id,
      statut: 'new',
      createdAt: new Date().toISOString(),
      ...data as Reservation
    };
    
    try {
      await setDoc(doc(db, 'reservations', id), newRes);
      setShowModal(newRes);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reservations/${id}`);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
      <Navbar 
        onOpenAdmin={() => setIsAdminOpen(true)} 
        onOpenTrack={() => setIsTrackOpen(true)}
        logo={logo}
      />
      
      <main>
        <Hero image={heroImage} title={heroTitle} subtitle={heroSubtitle} />
        <Services items={services} />
        <TouristSites sites={touristSites} />
        
        {/* Reservation Section */}
        <section id="reservation" className="bg-dark section-padding">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.4fr] gap-16 items-start">
            <div className="animate-fade-up">
              <span className="block text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Réservation en ligne</span>
              <h2 className="font-serif text-4xl md:text-6xl font-light text-white leading-tight mb-8">
                Réservez en<br />3 minutes chrono.
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-10">
                Remplissez le formulaire et recevez une confirmation instantanée sur WhatsApp et par e-mail. 
                Paiement sécurisé par Wave, Orange Money ou carte bancaire.
              </p>
              <ul className="space-y-4">
                {[
                  'Confirmation immédiate sur WhatsApp',
                  'Suivi de vol inclus (transferts aéroport)',
                  'Annulation gratuite jusqu\'à 24h avant',
                  'Paiement Wave / Orange Money / Stripe',
                  'Siège enfant sur demande'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-gold mt-1">✦</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <BookingForm prices={prices} onSubmit={handleBooking} />
          </div>
        </section>

        <Tarifs prices={prices} />
        <About photo={founderPhoto} tiktokName={tiktokName} />
        <Reviews items={reviews} />
        
        {/* Contact Section */}
        <section id="contact" className="bg-dark section-padding text-center">
          <span className="block text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Nous contacter</span>
          <h2 className="font-serif text-4xl md:text-6xl font-light text-white leading-tight mb-16">
            Parlons de<br />votre prochain trajet.
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: <MessageCircle />, title: 'WhatsApp', info: 'Disponible 24h/24', link: '+221 76 638 59 38', url: 'https://wa.me/221766385938' },
              { icon: <Music2 />, title: 'TikTok', info: 'Suivez-nous', link: tiktokName, url: `https://www.tiktok.com/@${tiktokName.replace('@', '')}` },
              { icon: <Facebook />, title: 'Facebook', info: 'Notre page', link: <span translate="no">ElleDrives Sénégal</span>, url: 'https://www.facebook.com/share/1BEHgAMwgr/?mibextid=wwXlfr' }
            ].map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-gold/20 p-10 rounded-sm hover:border-gold transition-colors block">
                <div className="text-gold flex justify-center mb-6">{c.icon}</div>
                <h3 className="font-serif text-xl text-white mb-2">{c.title}</h3>
                <p className="text-white/40 text-sm mb-4">{c.info}</p>
                <div className="text-gold font-medium">{c.link}</div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <Footer tiktokName={tiktokName} logo={logo} />

      {/* WhatsApp Float */}
      <a 
        href="https://wa.me/221766385938" 
        className="fixed bottom-8 right-8 z-[90] w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform animate-pulse"
      >
        <MessageCircle size={28} />
      </a>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {showModal && (
          <SuccessModal 
            reservation={showModal} 
            onClose={() => setShowModal(null)} 
            onCancel={handleCancelReservation}
          />
        )}
        {isTrackOpen && (
          <TrackReservationModal 
            onClose={() => setIsTrackOpen(false)}
            onFound={(res) => {
              setShowModal(res);
              setIsTrackOpen(false);
            }}
          />
        )}
        {isAdminOpen && (
          <AdminDashboard 
            reservations={reservations} 
            onUpdate={handleUpdateReservation}
            prices={prices}
            onUpdatePrices={handleUpdatePrices}
            founderPhoto={founderPhoto}
            onUpdatePhoto={handleUpdatePhoto}
            logo={logo}
            onUpdateLogo={handleUpdateLogo}
            heroImage={heroImage}
            onUpdateHero={handleUpdateHero}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            onUpdateHeroText={handleUpdateHeroText}
            services={services}
            onUpdateServices={handleUpdateServices}
            reviews={reviews}
            onUpdateReviews={handleUpdateReviews}
            tiktokName={tiktokName}
            onUpdateTiktok={handleUpdateTiktok}
            touristSites={touristSites}
            onUpdateTouristSites={handleUpdateTouristSites}
            onUpdateAllReservations={handleUpdateAllReservations}
            onClose={() => setIsAdminOpen(false)} 
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

// --- Sub-components (BookingForm, Tarifs, About, etc.) ---

const BookingForm = ({ prices, onSubmit }: { prices: any, onSubmit: (data: any) => void }) => {
  const [activeTab, setActiveTab] = useState<ReservationType>('transfert');
  const [formData, setFormData] = useState<any>({
    pax: '1 passager',
    bag: '1 bagage',
    extras: [],
    basePrice: 0,
    bouquetPrice: 0,
    paymentMethod: 'wave',
    isRoundTrip: false,
    withDriver: true,
    locationZone: 'dakar'
  });

  const calculateTotal = () => {
    let total = (formData.basePrice || 0);
    
    if (activeTab === 'transfert' && formData.isRoundTrip) {
      total *= 2;
    }

    return total + (formData.bouquetPrice || 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, type: activeTab, montant: calculateTotal() });
  };

  const toggleExtra = (extra: string) => {
    const current = formData.extras || [];
    if (current.includes(extra)) {
      const newExtras = current.filter((e: string) => e !== extra);
      const newBouquetPrice = extra === '🌸 Bouquet accueil' ? 0 : formData.bouquetPrice;
      setFormData({ ...formData, extras: newExtras, bouquetPrice: newBouquetPrice });
    } else {
      setFormData({ ...formData, extras: [...current, extra] });
    }
  };

  return (
    <div className="bg-white/5 border border-gold/20 p-8 md:p-10 rounded-sm">
      <div className="flex border-b border-gold/20 mb-8 overflow-x-auto">
        {[
          { id: 'transfert', label: '✈ Aéroport', icon: <Plane size={14} /> },
          { id: 'dispo', label: '🚗 Mise à dispo', icon: <Clock size={14} /> },
          { id: 'location', label: '🔑 Location', icon: <Key size={14} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as ReservationType);
              setFormData({ ...formData, basePrice: 0, montant: 0 });
            }}
            className={`flex items-center gap-2 px-6 py-3 text-[11px] font-medium tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-white/30 border-transparent hover:text-white/60'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label-field">Prénom & Nom</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              placeholder="Aminata Diallo"
              onChange={e => setFormData({ ...formData, nom: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">WhatsApp</label>
            <input 
              type="tel" 
              required 
              className="input-field" 
              placeholder="+221 76 638 59 38"
              onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label-field">E-mail (Optionnel)</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="aminata@example.com"
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">Mode de paiement</label>
            <select 
              required 
              className="input-field"
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="wave">Wave (Sénégal)</option>
              <option value="cash">Espèces (à bord)</option>
              <option value="card">Carte Bancaire</option>
            </select>
          </div>
        </div>

        {activeTab === 'transfert' && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">Nombre de sièges</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  required 
                  className="input-field" 
                  placeholder="1"
                  onChange={e => setFormData({ ...formData, sieges: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field">Nombre de valises</label>
                <input 
                  type="number" 
                  min="0"
                  max="20"
                  required 
                  className="input-field" 
                  placeholder="1"
                  onChange={e => setFormData({ ...formData, valises: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">Date de voyage</label>
                <input type="date" required className="input-field" onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="label-field">Heure d'arrivée</label>
                <input type="time" required className="input-field" onChange={e => setFormData({ ...formData, heure: e.target.value })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">N° de vol</label>
                <input type="text" required className="input-field" placeholder="AF 718" onChange={e => setFormData({ ...formData, vol: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="label-field">Provenance</label>
                <input type="text" required className="input-field" placeholder="Paris CDG" onChange={e => setFormData({ ...formData, from: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="label-field">Destination</label>
              <select 
                required
                className="input-field appearance-none" 
                onChange={e => {
                  const val = parseInt(e.target.value);
                  const text = e.target.options[e.target.selectedIndex].text.split('—')[0].trim();
                  setFormData({ ...formData, basePrice: val, dest: text });
                }}
              >
                <option value="">Choisir la destination...</option>
                <option value={prices.transfert.dakarCentre}>Dakar Centre / Plateau — {prices.transfert.dakarCentre.toLocaleString()} FCFA</option>
                <option value={prices.transfert.almadies}>Almadies / Ngor — {prices.transfert.almadies.toLocaleString()} FCFA</option>
                <option value={prices.transfert.diamniadio}>Diamniadio — {prices.transfert.diamniadio.toLocaleString()} FCFA</option>
                <option value={prices.transfert.saly}>Saly / Mbour — {prices.transfert.saly.toLocaleString()} FCFA</option>
                <option value={prices.transfert.bandia}>Réserve de Bandia — {prices.transfert.bandia.toLocaleString()} FCFA</option>
                <option value={prices.transfert.lompoul}>Lompoul — {prices.transfert.lompoul.toLocaleString()} FCFA</option>
                <option value={prices.transfert.thies}>Thiès — {prices.transfert.thies.toLocaleString()} FCFA</option>
                <option value={prices.transfert.saintLouis}>Saint Louis — {prices.transfert.saintLouis.toLocaleString()} FCFA</option>
                <option value={prices.transfert.louga}>Louga — {prices.transfert.louga.toLocaleString()} FCFA</option>
                <option value={prices.transfert.kaolack}>Kaolack — {prices.transfert.kaolack.toLocaleString()} FCFA</option>
                <option value={prices.transfert.somone}>Somone — {prices.transfert.somone.toLocaleString()} FCFA</option>
                <option value={prices.transfert.lacRose}>Lac Rose — {prices.transfert.lacRose.toLocaleString()} FCFA</option>
                <option value={prices.transfert.saloum}>Île du Saloum — {prices.transfert.saloum.toLocaleString()} FCFA</option>
                <option value={prices.transfert.touba}>Touba — {prices.transfert.touba.toLocaleString()} FCFA</option>
                <option value={prices.transfert.tivaouane}>Tivaouane — {prices.transfert.tivaouane.toLocaleString()} FCFA</option>
              </select>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-sm">
              <input 
                type="checkbox" 
                id="roundTrip"
                className="w-4 h-4 accent-gold"
                checked={formData.isRoundTrip}
                onChange={e => setFormData({ ...formData, isRoundTrip: e.target.checked })}
              />
              <label htmlFor="roundTrip" className="text-xs text-white/70 cursor-pointer">
                Option Aller-Retour (Tarif x2)
              </label>
            </div>
          </>
        )}

        {activeTab === 'dispo' && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">Nombre de sièges</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  required 
                  className="input-field" 
                  placeholder="1"
                  onChange={e => setFormData({ ...formData, sieges: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field">Nombre de valises</label>
                <input 
                  type="number" 
                  min="0"
                  max="20"
                  required 
                  className="input-field" 
                  placeholder="1"
                  onChange={e => setFormData({ ...formData, valises: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">Date</label>
                <input type="date" required className="input-field" onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="label-field">Heure de début</label>
                <input type="time" required className="input-field" onChange={e => setFormData({ ...formData, heure: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="label-field">Durée souhaitée</label>
              <select 
                required
                className="input-field" 
                onChange={e => {
                  const val = parseInt(e.target.value);
                  const text = e.target.options[e.target.selectedIndex].text;
                  setFormData({ ...formData, basePrice: val, duree: text });
                }}
              >
                <option value="">Choisir...</option>
                <option value={prices.dispo.demiJournee}>Demi-journée (4h) — {prices.dispo.demiJournee.toLocaleString()} FCFA</option>
                <option value={prices.dispo.journee}>Journée complète (8h) — {prices.dispo.journee.toLocaleString()} FCFA</option>
              </select>
            </div>
          </>
        )}

        {activeTab === 'location' && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">Type de véhicule</label>
                <select 
                  required
                  className="input-field" 
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    const text = e.target.options[e.target.selectedIndex].text;
                    setFormData({ ...formData, tarifJour: val, vehicule: text });
                  }}
                >
                  <option value="">Choisir un véhicule...</option>
                  <option value={prices.location.berline}>Citadine / Berline — {prices.location.berline.toLocaleString()} FCFA/jour</option>
                  <option value={prices.location.suv}>4x4 / SUV — {prices.location.suv.toLocaleString()} FCFA/jour</option>
                  <option value={prices.location.luxe}>Luxe / Prestige — {prices.location.luxe.toLocaleString()} FCFA/jour</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-field">Zone de circulation</label>
                <select 
                  required
                  className="input-field" 
                  onChange={e => setFormData({ ...formData, locationZone: e.target.value })}
                >
                  <option value="dakar">Dakar uniquement</option>
                  <option value="hors-dakar">Hors Dakar (Sénégal)</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-field">Date de départ</label>
                <input type="date" required className="input-field" onChange={e => setFormData({ ...formData, debut: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="label-field">Date de restitution</label>
                <input type="date" required className="input-field" onChange={e => {
                  const fin = e.target.value;
                  const debut = formData.debut;
                  let basePrice = 0;
                  if (debut && fin) {
                    const d1 = new Date(debut);
                    const d2 = new Date(fin);
                    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) || 1;
                    basePrice = diff * (formData.tarifJour || 0);
                  }
                  setFormData({ ...formData, fin, basePrice });
                }} />
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-sm">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="withDriver"
                  className="w-4 h-4 accent-gold"
                  checked={formData.withDriver}
                  onChange={e => setFormData({ ...formData, withDriver: e.target.checked })}
                />
                <label htmlFor="withDriver" className="text-xs text-white/70 cursor-pointer">
                  Avec chauffeur (Recommandé)
                </label>
              </div>
              {formData.locationZone === 'hors-dakar' && (
                <p className="text-[10px] text-gold/80 italic leading-relaxed">
                  ⚠️ Note : Pour les trajets hors Dakar, les frais de bouche et d'hébergement du chauffeur sont à la charge du client.
                </p>
              )}
            </div>
          </>
        )}

        <div className="space-y-3">
          <label className="label-field">Options confort</label>
          <div className="flex flex-wrap gap-2">
            {['💺 Siège enfant', '📶 Wi-Fi bord', '💧 Eau fraîche', '🌸 Bouquet accueil'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleExtra(opt)}
                className={`px-4 py-1.5 rounded-full text-[10px] tracking-wide transition-all border ${formData.extras?.includes(opt) ? 'bg-gold/20 border-gold text-gold' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'}`}
              >
                {opt}
              </button>
            ))}
          </div>
          
          {formData.extras?.includes('🌸 Bouquet accueil') && (
            <div className="mt-4 p-4 bg-white/5 border border-gold/20 rounded-sm animate-fade-in">
              <label className="label-field mb-3 block text-gold">Choisir le type de bouquet</label>
              <div className="grid grid-cols-3 gap-2">
                {[prices.bouquets.small, prices.bouquets.medium, prices.bouquets.large].map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setFormData({ ...formData, bouquetPrice: price })}
                    className={`py-2 text-[10px] rounded-sm border transition-all ${formData.bouquetPrice === price ? 'bg-gold text-dark border-gold' : 'bg-transparent border-white/10 text-white/60 hover:border-gold/50'}`}
                  >
                    {price.toLocaleString()} FCFA
                  </button>
                ))}
              </div>
              {formData.bouquetPrice === 0 && <p className="text-[10px] text-red-400 mt-2 italic">Veuillez sélectionner un prix pour le bouquet.</p>}
            </div>
          )}
        </div>

        <div className="bg-gold/10 border border-gold/25 p-4 rounded-sm flex justify-between items-center">
          <div>
            <div className="text-[10px] text-white/40 tracking-widest">Estimation totale</div>
            <div className="text-[10px] text-white/20">Acompte de 10000 FR requis</div>
          </div>
          <div className="text-right">
            <span className="font-serif text-2xl text-gold">{calculateTotal() > 0 ? calculateTotal().toLocaleString('fr-FR') + ' FCFA' : '—'}</span>
            {calculateTotal() > 0 && <div className="text-[10px] text-white/30">≈ {Math.round(calculateTotal() / 655)}€</div>}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={formData.extras?.includes('🌸 Bouquet accueil') && formData.bouquetPrice === 0}
          className={`btn-primary w-full ${(formData.extras?.includes('🌸 Bouquet accueil') && formData.bouquetPrice === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Confirmer la réservation →
        </button>
      </form>
    </div>
  );
};

const Tarifs = ({ prices }: { prices: any }) => {
  const [activeTab, setActiveTab] = useState('airport');

  return (
    <section id="tarifs" className="section-padding bg-cream">
      <span className="block text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Transparence totale</span>
      <h2 className="font-serif text-4xl md:text-6xl font-light text-dark leading-tight mb-16">
        Nos tarifs,<br />sans surprise.
      </h2>

      <div className="flex flex-wrap gap-2 mb-12">
        {[
          { id: 'airport', label: 'Transferts Aéroport' },
          { id: 'dispo', label: 'Mise à Disposition' },
          { id: 'loc', label: 'Location' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-full text-[11px] font-medium tracking-widest uppercase transition-all border ${activeTab === tab.id ? 'bg-gold border-gold text-dark' : 'bg-transparent border-gold/30 text-ink-muted hover:bg-gold/10'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up">
        {activeTab === 'airport' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-dark text-white/50 text-[10px] tracking-[0.15em] uppercase">
                  <th className="text-left p-4 font-medium">Destination</th>
                  <th className="text-left p-4 font-medium">Berline (1–3 pers.)</th>
                  <th className="text-left p-4 font-medium">SUV / Van (4–7 pers.)</th>
                  <th className="text-left p-4 font-medium">Inclus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {[
                  { dest: 'AIBD ↔ Dakar Centre', b: prices.transfert.dakarCentre.toLocaleString(), s: (prices.transfert.dakarCentre + prices.transfert.dakarCentreSUV).toLocaleString(), inc: 'Accueil pancarte + suivi vol' },
                  { dest: 'AIBD ↔ Almadies / Ngor', b: prices.transfert.almadies.toLocaleString(), s: (prices.transfert.almadies + prices.transfert.almadiesSUV).toLocaleString(), inc: 'Accueil pancarte + suivi vol' },
                  { dest: 'AIBD ↔ Diamniadio', b: prices.transfert.diamniadio.toLocaleString(), s: (prices.transfert.diamniadio + prices.transfert.diamniadioSUV).toLocaleString(), inc: 'Accueil pancarte + suivi vol' },
                  { dest: 'AIBD ↔ Saly / Mbour', b: prices.transfert.saly.toLocaleString(), s: (prices.transfert.saly + prices.transfert.salySUV).toLocaleString(), inc: 'Accueil pancarte + suivi vol' }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gold/5 transition-colors">
                    <td className="p-4 text-dark font-medium">{row.dest}</td>
                    <td className="p-4 font-serif text-lg text-gold font-semibold">{row.b} FCFA</td>
                    <td className="p-4 font-serif text-lg text-gold font-semibold">{row.s} FCFA</td>
                    <td className="p-4 text-ink-muted text-xs">{row.inc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'dispo' && (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Demi-journée', title: '4 heures', price: prices.dispo.demiJournee.toLocaleString(), features: ['Carburant inclus (Dakar)', 'Chauffeuse dédiée', 'Arrêts illimités'] },
              { label: 'Journée complète', title: '8 heures', price: prices.dispo.journee.toLocaleString(), features: ['Carburant inclus (Dakar)', 'Chauffeuse dédiée', 'Arrêts illimités'] },
              { label: 'Hors Dakar', title: 'Sur devis', price: 'Contactez-nous', features: ['Petite Côte, Thiès...', 'Carburant + hébergement'] }
            ].map((card, i) => (
              <div key={i} className="bg-white border border-gold/20 p-8 rounded-sm hover:-translate-y-1 transition-all">
                <div className="text-[10px] tracking-[0.15em] uppercase text-gold mb-2">{card.label}</div>
                <h3 className="font-serif text-2xl text-dark mb-2">{card.title}</h3>
                <div className="font-serif text-3xl text-dark mb-6">{card.price} <span className="text-sm font-sans text-ink-muted">FCFA</span></div>
                <ul className="space-y-3">
                  {card.features.map((f, j) => (
                    <li key={j} className="text-xs text-ink-muted flex gap-2">
                      <span className="text-gold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'loc' && (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Berline', title: 'Citadine / Sedan', price: prices.location.berline.toLocaleString(), features: ['Idéale pour Dakar', 'Climatisation', 'Caution requise'] },
              { label: '4x4 / SUV', title: 'Tout terrain', price: prices.location.suv.toLocaleString(), features: ['Idéal hors Dakar', 'Grand coffre', 'Caution requise'] },
              { label: 'Prestige', title: 'Luxe & Business', price: prices.location.luxe.toLocaleString(), features: ['Véhicule premium', 'Événements & VIP'] }
            ].map((card, i) => (
              <div key={i} className="bg-white border border-gold/20 p-8 rounded-sm hover:-translate-y-1 transition-all">
                <div className="text-[10px] tracking-[0.15em] uppercase text-gold mb-2">{card.label}</div>
                <h3 className="font-serif text-2xl text-dark mb-2">{card.title}</h3>
                <div className="font-serif text-3xl text-dark mb-6">{card.price} <span className="text-sm font-sans text-ink-muted">FCFA / jour</span></div>
                <ul className="space-y-3">
                  {card.features.map((f, j) => (
                    <li key={j} className="text-xs text-ink-muted flex gap-2">
                      <span className="text-gold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const About = ({ photo, tiktokName }: { photo: string | null, tiktokName: string }) => (
  <section id="apropos" className="bg-dark2 grid lg:grid-cols-2 p-0">
    <div className="relative min-h-[400px] lg:min-h-[600px] bg-gradient-to-br from-dark2 to-dark flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/luxury/1200/800')] bg-cover bg-center" />
      <div className="relative z-10 text-center">
        <div className="w-44 h-44 rounded-full border-4 border-gold bg-gold/10 flex items-center justify-center text-6xl shadow-[0_0_60px_rgba(201,168,76,0.2)] mx-auto mb-6 overflow-hidden">
          {photo ? (
            <img src={photo} alt="Khady Diouf" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grayscale-0">👩🏾‍💼</span>
          )}
        </div>
        <h3 className="font-serif text-3xl text-white font-light mb-1">Khady Diouf</h3>
        <div className="text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Fondatrice & CEO</div>
        <a 
          href={`https://www.tiktok.com/@${tiktokName.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white/60 text-[10px] px-4 py-1.5 rounded-full hover:border-gold hover:text-gold transition-all"
        >
          <Music2 size={12} /> Vu sur TikTok · 50k+ abonnés
        </a>
      </div>
    </div>
    
    <div className="section-padding flex flex-col justify-center">
      <span className="text-[11px] tracking-[0.2em] uppercase text-gold mb-4">Notre histoire</span>
      <h2 className="font-serif text-4xl md:text-6xl font-light text-white leading-tight mb-8">
        L'Expérience<br /><em className="italic text-gold" translate="no">ElleDrives</em>
      </h2>
      <p className="text-white/60 text-base leading-relaxed mb-6">
        Bienvenue chez <span translate="no">ElleDrives</span>, le service de transport qui redéfinit la mobilité au Sénégal. 
        Fondé par Khady Diouf, <span translate="no">ElleDrives</span> est né d'une vision simple : offrir un service premium, 
        ponctuel et d'une sérénité absolue.
      </p>
      
      <div className="border-l-2 border-gold pl-6 my-8">
        <p className="font-serif text-xl italic text-white/80 leading-relaxed">
          "Je ne me contente pas de vous conduire d'un point A à un point B. Je m'assure que chaque kilomètre soit synonyme de confort et de tranquillité d'esprit."
        </p>
        <div className="text-[11px] text-gold uppercase tracking-widest mt-4">— Khady Diouf, Fondatrice</div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {['Ponctualité', 'Transparence', 'Sécurité', 'Service 24/7'].map((v) => (
          <span key={v} className="bg-gold/10 border border-gold/30 text-gold text-[10px] px-4 py-1.5 rounded-full tracking-wider">
            {v}
          </span>
        ))}
      </div>
    </div>
  </section>
);

const TrackReservationModal = ({ onClose, onFound }: { onClose: () => void, onFound: (res: Reservation) => void }) => {
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const docRef = doc(db, 'reservations', id.toUpperCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        onFound({ id: docSnap.id, ...docSnap.data() } as Reservation);
      } else {
        setError('Réservation introuvable. Vérifiez la référence (ex: ED-1234).');
      }
    } catch (err) {
      setError('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-dark2 border border-gold/30 p-10 rounded-lg max-w-md w-full text-center"
      >
        <h2 className="font-serif text-2xl text-white mb-2">Suivi de Réservation</h2>
        <p className="text-white/40 text-sm mb-8">Entrez votre référence pour consulter ou annuler votre réservation.</p>
        
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Référence (ex: ED-1234)" 
            className="input-field text-center uppercase"
            value={id}
            onChange={e => setId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
          <button onClick={onClose} className="text-white/20 text-xs uppercase tracking-widest hover:text-white/40 transition-colors">✕ Fermer</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SuccessModal = ({ reservation, onClose, onCancel }: { reservation: Reservation, onClose: () => void, onCancel: (id: string) => void }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  
  const wa = reservation.whatsapp.replace(/[^0-9+]/g, '');
  const waText = encodeURIComponent(`Bonjour Khady ✨\n\nJ'ai effectué une réservation sur ElleDrives !\n\nRéf : *${reservation.id}*\nNom : *${reservation.nom}*\nType : *${reservation.type}*\nMontant : *${reservation.montant?.toLocaleString()} FCFA*\n${reservation.extras?.length ? `Options : *${reservation.extras.join(', ')}*` : ''}\n\nMerci de me confirmer la disponibilité ! 🇸🇳`);

  const contactPhone = '+221 76 638 59 38';
  const waLink = `https://wa.me/221766385938?text=${waText}`;

  const isLate = () => {
    const resDate = reservation.date || reservation.debut;
    const resTime = reservation.heure || reservation.heureDebut || "00:00";
    if (!resDate) return false;
    try {
      const reservationDate = new Date(`${resDate}T${resTime}`);
      const now = new Date();
      const diffInHours = (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffInHours <= 24;
    } catch (e) {
      return false;
    }
  };

  const handleCancel = async () => {
    let refundMessage = "Êtes-vous sûr de vouloir annuler cette réservation ?";
    if (isLate()) {
      refundMessage += "\n\n⚠️ Attention : L'acompte de 10000 FR n'est pas remboursable car l'annulation est faite moins de 24h avant la date prévue.";
    }

    if (window.confirm(refundMessage)) {
      setIsCancelling(true);
      await onCancel(reservation.id);
      setIsCancelling(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-dark2 border border-gold/30 p-10 rounded-lg max-w-lg w-full text-center"
      >
        <div className="text-5xl mb-6">
          {reservation.statut === 'cancelled' ? '❌' : '✅'}
        </div>
        <h2 className="font-serif text-3xl text-white mb-2">
          {reservation.statut === 'cancelled' ? 'Réservation Annulée' : 'Réservation reçue !'}
        </h2>
        <div className="text-gold text-xs tracking-widest uppercase mb-8">Ref : {reservation.id}</div>
        
        <div className="bg-white/5 border border-gold/20 rounded-sm p-6 text-left mb-8 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Client</span>
            <span className="text-white font-medium">{reservation.nom}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Statut</span>
            <span className={`font-medium uppercase ${reservation.statut === 'cancelled' ? 'text-red-400' : 'text-gold'}`}>
              {reservation.statut}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Service</span>
            <span className="text-white font-medium capitalize">
              {reservation.type} {reservation.isRoundTrip ? '(Aller-Retour)' : ''}
            </span>
          </div>
          {reservation.type === 'location' ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-white/30">Zone</span>
                <span className="text-white font-medium capitalize">{reservation.locationZone === 'dakar' ? 'Dakar' : 'Hors Dakar'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/30">Chauffeur</span>
                <span className="text-white font-medium">{reservation.withDriver ? 'Inclus' : 'Sans chauffeur'}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-white/30">Passagers / Bagages</span>
              <span className="text-white font-medium">{reservation.sieges || 1} sièges / {reservation.valises || 0} valises</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Paiement</span>
            <span className="text-gold font-medium uppercase">{reservation.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Montant estimé</span>
            <span className="text-gold font-bold">{reservation.montant ? reservation.montant.toLocaleString('fr-FR') + ' FCFA' : 'Sur devis'}</span>
          </div>
        </div>

        {reservation.statut !== 'cancelled' && (
          <p className="text-white/50 text-sm leading-relaxed mb-10">
            Votre demande est en cours de traitement. Vous allez être contacté par notre équipe pour confirmer votre réservation et procéder au paiement de l'acompte de 10000 FR.
          </p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {reservation.statut !== 'cancelled' && (
              <a 
                href={waLink} 
                target="_blank" 
                className="btn-primary px-8 flex items-center justify-center gap-2 !bg-[#25D366] !text-white"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
            {reservation.statut !== 'cancelled' && (
              <button 
                onClick={handleCancel}
                disabled={isCancelling}
                className="btn-outline px-8 !border-red-500/30 !text-red-400 hover:!bg-red-500/10"
              >
                {isCancelling ? 'Annulation...' : 'Annuler'}
              </button>
            )}
            <button onClick={onClose} className="btn-outline px-8">Fermer</button>
          </div>
          {isLate() && reservation.statut !== 'cancelled' && (
            <p className="text-[10px] text-red-400/60 italic mt-2">
              Note : L'acompte de 10000 FR n'est pas remboursable si l'annulation est faite dans le délai de 24h avant la réservation.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const EditReservationModal = ({ 
  reservation, 
  onSave, 
  onClose 
}: { 
  reservation: Reservation, 
  onSave: (updated: Reservation) => void, 
  onClose: () => void 
}) => {
  const [data, setData] = useState<Reservation>({ ...reservation });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-dark2 border border-gold/30 p-8 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-serif text-2xl text-white">Modifier Réservation <span className="text-gold">{data.id}</span></h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={24} /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <label className="label-field">Nom Client</label>
            <input 
              type="text" 
              value={data.nom} 
              className="input-field" 
              onChange={e => setData({ ...data, nom: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">E-mail (Optionnel)</label>
            <input 
              type="email" 
              value={data.email || ''} 
              className="input-field" 
              onChange={e => setData({ ...data, email: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">WhatsApp</label>
            <input 
              type="text" 
              value={data.whatsapp} 
              className="input-field" 
              onChange={e => setData({ ...data, whatsapp: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">Mode de paiement</label>
            <select 
              value={data.paymentMethod || 'wave'} 
              className="input-field" 
              onChange={e => setData({ ...data, paymentMethod: e.target.value as any })}
            >
              <option value="wave">Wave</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-field">Date</label>
            <input 
              type="date" 
              value={data.date || data.debut || ''} 
              className="input-field" 
              onChange={e => setData({ ...data, date: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">Heure</label>
            <input 
              type="time" 
              value={data.heure || data.heureDebut || ''} 
              className="input-field" 
              onChange={e => setData({ ...data, heure: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">Montant (FCFA)</label>
            <input 
              type="number" 
              value={data.montant || 0} 
              className="input-field" 
              onChange={e => setData({ ...data, montant: parseInt(e.target.value) })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">Statut</label>
            <select 
              value={data.statut} 
              className="input-field" 
              onChange={e => setData({ ...data, statut: e.target.value as ReservationStatus })}
            >
              <option value="new">Nouveau</option>
              <option value="paid">Payé (Wave)</option>
              <option value="confirmed">Confirmé</option>
              <option value="done">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          
          {data.type === 'transfert' && (
            <div className="flex items-center gap-2 pt-4">
              <input 
                type="checkbox" 
                checked={data.isRoundTrip} 
                onChange={e => setData({ ...data, isRoundTrip: e.target.checked })}
              />
              <label className="text-[10px] uppercase text-white/40">Aller-Retour</label>
            </div>
          )}

          {data.type === 'location' && (
            <>
              <div className="space-y-1">
                <label className="label-field">Zone</label>
                <select 
                  value={data.locationZone} 
                  className="input-field" 
                  onChange={e => setData({ ...data, locationZone: e.target.value as any })}
                >
                  <option value="dakar">Dakar</option>
                  <option value="hors-dakar">Hors Dakar</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input 
                  type="checkbox" 
                  checked={data.withDriver} 
                  onChange={e => setData({ ...data, withDriver: e.target.checked })}
                />
                <label className="text-[10px] uppercase text-white/40">Avec Chauffeur</label>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="label-field">Nombre de sièges</label>
            <input 
              type="number" 
              value={data.sieges || 1} 
              className="input-field" 
              onChange={e => setData({ ...data, sieges: parseInt(e.target.value) })} 
            />
          </div>
          <div className="space-y-1">
            <label className="label-field">Nombre de valises</label>
            <input 
              type="number" 
              value={data.valises || 0} 
              className="input-field" 
              onChange={e => setData({ ...data, valises: parseInt(e.target.value) })} 
            />
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 mb-8">
          <h3 className="text-gold text-xs uppercase tracking-widest mb-6">Retour Client / Feedback</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="label-field">Note (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button 
                    key={s}
                    onClick={() => setData({ ...data, rating: s })}
                    className={`text-gold transition-colors ${data.rating && data.rating >= s ? 'opacity-100' : 'opacity-30'}`}
                  >
                    <Star size={20} fill={data.rating && data.rating >= s ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="label-field">Commentaire client</label>
              <textarea 
                value={data.feedback || ''} 
                rows={3}
                className="input-field resize-none" 
                placeholder="Avis du client sur le chauffeur..."
                onChange={e => setData({ ...data, feedback: e.target.value })} 
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => onSave(data)} 
            className="btn-primary flex-1"
          >
            Enregistrer les modifications
          </button>
          <button onClick={onClose} className="btn-outline flex-1">Annuler</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdminDashboard = ({ 
  reservations, 
  onUpdate, 
  prices, 
  onUpdatePrices, 
  founderPhoto, 
  onUpdatePhoto,
  tiktokName,
  onUpdateTiktok,
  touristSites,
  onUpdateTouristSites,
  logo,
  onUpdateLogo,
  heroImage,
  onUpdateHero,
  heroTitle,
  heroSubtitle,
  onUpdateHeroText,
  services,
  onUpdateServices,
  reviews,
  onUpdateReviews,
  onUpdateAllReservations,
  onClose,
  user,
  onLogin,
  onLogout
}: { 
  reservations: Reservation[], 
  onUpdate: (r: Reservation) => Promise<void>, 
  prices: any,
  onUpdatePrices: (p: any) => Promise<void>,
  founderPhoto: string | null,
  onUpdatePhoto: (p: string) => Promise<void>,
  logo: string | null,
  onUpdateLogo: (l: string) => Promise<void>,
  heroImage: string,
  onUpdateHero: (h: string) => Promise<void>,
  heroTitle: string,
  heroSubtitle: string,
  onUpdateHeroText: (t: string, s: string) => Promise<void>,
  services: ServiceItem[],
  onUpdateServices: (s: ServiceItem[]) => Promise<void>,
  reviews: ReviewItem[],
  onUpdateReviews: (r: ReviewItem[]) => Promise<void>,
  tiktokName: string,
  onUpdateTiktok: (n: string) => Promise<void>,
  touristSites: TouristSite[],
  onUpdateTouristSites: (s: TouristSite[]) => Promise<void>,
  onUpdateAllReservations: (r: Reservation[]) => Promise<void>,
  onClose: () => void,
  user: User | null,
  onLogin: () => void,
  onLogout: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'settings' | 'tourisme' | 'content' | 'backups'>('reservations');
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [editingSite, setEditingSite] = useState<TouristSite | null>(null);
  const [adminLoading, setAdminLoading] = useState<string | null>(null);

  // Local states for explicit saving
  const [localHeroTitle, setLocalHeroTitle] = useState(heroTitle);
  const [localHeroSubtitle, setLocalHeroSubtitle] = useState(heroSubtitle);
  const [localServices, setLocalServices] = useState(services);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [localPrices, setLocalPrices] = useState(prices);
  const [localTiktokName, setLocalTiktokName] = useState(tiktokName);
  const [localLogo, setLocalLogo] = useState(logo);
  const [localFounderPhoto, setLocalFounderPhoto] = useState(founderPhoto);
  const [localHeroImage, setLocalHeroImage] = useState(heroImage);

  // Sync local state when props change (initial load or remote updates)
  useEffect(() => { setLocalHeroTitle(heroTitle); }, [heroTitle]);
  useEffect(() => { setLocalHeroSubtitle(heroSubtitle); }, [heroSubtitle]);
  useEffect(() => { setLocalServices(services); }, [services]);
  useEffect(() => { setLocalReviews(reviews); }, [reviews]);
  useEffect(() => { setLocalPrices(prices); }, [prices]);
  useEffect(() => { setLocalTiktokName(tiktokName); }, [tiktokName]);
  useEffect(() => { setLocalLogo(logo); }, [logo]);
  useEffect(() => { setLocalFounderPhoto(founderPhoto); }, [founderPhoto]);
  useEffect(() => { setLocalHeroImage(heroImage); }, [heroImage]);

  const addSite = () => {
    const newSite: TouristSite = {
      id: Date.now().toString(),
      title: 'Nouveau Site',
      desc: 'Description du site...',
      img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
      order: touristSites.length
    };
    onUpdateTouristSites([...touristSites, newSite]);
  };

  const deleteSite = (id: string) => {
    onUpdateTouristSites(touristSites.filter(s => s.id !== id));
  };

  const handleExportData = () => {
    const data = {
      reservations,
      prices,
      services,
      reviews,
      touristSites,
      siteConfig: {
        heroImage,
        heroTitle,
        heroSubtitle,
        logo,
        founderPhoto,
        tiktokName
      },
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elledrives_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setAdminLoading("Importation des données...");
          
          const updates: Promise<any>[] = [];
          
          // Update everything
          if (data.prices) updates.push(onUpdatePrices(data.prices));
          if (data.services) updates.push(onUpdateServices(data.services));
          if (data.reviews) updates.push(onUpdateReviews(data.reviews));
          if (data.touristSites) updates.push(onUpdateTouristSites(data.touristSites));
          if (data.reservations) updates.push(onUpdateAllReservations(data.reservations));
          
          if (data.siteConfig) {
            const config = data.siteConfig;
            if (config.heroImage) updates.push(onUpdateHero(config.heroImage));
            if (config.heroTitle && config.heroSubtitle) updates.push(onUpdateHeroText(config.heroTitle, config.heroSubtitle));
            if (config.logo) updates.push(onUpdateLogo(config.logo));
            if (config.founderPhoto) updates.push(onUpdatePhoto(config.founderPhoto));
            if (config.tiktokName) updates.push(onUpdateTiktok(config.tiktokName));
          }
          
          await Promise.all(updates);
          
          setAdminLoading(null);
          alert("Données importées avec succès !");
        } catch (err) {
          console.error(err);
          setAdminLoading(null);
          alert("Erreur lors de l'importation du fichier JSON.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetTouristSites = () => {
    if (window.confirm("Voulez-vous vraiment réinitialiser les sites touristiques aux valeurs par défaut ?")) {
      onUpdateTouristSites(DEFAULT_TOURIST_SITES);
    }
  };

  const saveSite = (site: TouristSite) => {
    onUpdateTouristSites(touristSites.map(s => s.id === site.id ? site : s));
    setEditingSite(null);
  };

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-dark flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full text-center">
          <h2 className="font-serif text-3xl text-white mb-8">Administration</h2>
          <button 
            onClick={onLogin}
            className="btn-primary w-full flex items-center justify-center gap-3"
          >
            <Settings size={20} /> Se connecter avec Google
          </button>
          <button onClick={onClose} className="mt-6 text-white/30 hover:text-white text-sm">Retour au site</button>
        </div>
      </motion.div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdminLoading("Optimisation de l'image...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 800, 800, 0.8);
        setLocalFounderPhoto(compressed);
        setAdminLoading(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdminLoading("Optimisation de l'image...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 400, 400, 0.9);
        setLocalLogo(compressed);
        setAdminLoading(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdminLoading("Optimisation de l'image...");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920, 1080, 0.7);
        setLocalHeroImage(compressed);
        setAdminLoading(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateStatus = (id: string, status: ReservationStatus) => {
    const res = reservations.find(r => r.id === id);
    if (res) {
      onUpdate({ ...res, statut: status });
    }
  };

  const handleSaveEdit = (updatedRes: Reservation) => {
    onUpdate(updatedRes);
    setEditingRes(null);
  };

  const filtered = reservations.filter(r => {
    const matchesFilter = filter === 'all' || r.statut === filter;
    const matchesSearch = r.nom.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-dark flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full bg-dark2 border border-gold/20 p-10 rounded-lg text-center">
          <div className="text-4xl mb-6">🔐</div>
          <h2 className="font-serif text-2xl text-white mb-2">Espace Khady</h2>
          <p className="text-white/40 text-sm mb-8">Accès réservé à l'administratrice d'<span translate="no">ElleDrives</span></p>
          <button onClick={onLogin} className="btn-primary w-full mb-6 flex items-center justify-center gap-3">
            <Settings size={20} /> Se connecter avec Google
          </button>
          <button onClick={onClose} className="text-white/20 text-xs uppercase tracking-widest hover:text-white/40 transition-colors">✕ Fermer</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[300] bg-dark overflow-y-auto"
    >
      <AnimatePresence>
        {adminLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-dark/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gold font-serif text-lg">{adminLoading}</p>
            <p className="text-white/40 text-xs mt-2">Veuillez patienter pendant l'opération.</p>
          </motion.div>
        )}
        {editingRes && (
          <EditReservationModal 
            reservation={editingRes} 
            onSave={handleSaveEdit} 
            onClose={() => setEditingRes(null)} 
          />
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-10 bg-dark2 border-b border-gold/20 px-6 py-4 flex items-center justify-between">
        <div className="font-serif text-xl text-gold" translate="no">ElleDrives <span className="italic text-white/40 text-sm">Dashboard</span></div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            <button 
              onClick={() => setActiveTab('reservations')}
              className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all ${activeTab === 'reservations' ? 'bg-gold text-dark' : 'text-white/40 hover:text-white'}`}
            >
              Réservations
            </button>
            <button 
              onClick={() => setActiveTab('tourisme')}
              className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all ${activeTab === 'tourisme' ? 'bg-gold text-dark' : 'text-white/40 hover:text-white'}`}
            >
              Tourisme
            </button>
            <button 
              onClick={() => setActiveTab('content')}
              className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all ${activeTab === 'content' ? 'bg-gold text-dark' : 'text-white/40 hover:text-white'}`}
            >
              Contenu
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all ${activeTab === 'settings' ? 'bg-gold text-dark' : 'text-white/40 hover:text-white'}`}
            >
              Paramètres
            </button>
            <button 
              onClick={() => setActiveTab('backups')}
              className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all ${activeTab === 'backups' ? 'bg-gold text-dark' : 'text-white/40 hover:text-white'}`}
            >
              Sauvegardes
            </button>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Connecté</div>
            <div className="text-xs text-gold">{user?.email}</div>
          </div>
          <button onClick={onLogout} className="text-white/40 hover:text-white text-xs uppercase tracking-widest">Déconnexion</button>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-4">✕ Fermer</button>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {activeTab === 'reservations' ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Total', value: reservations.length, color: 'white' },
                { label: 'Nouvelles', value: reservations.filter(r => r.statut === 'new').length, color: 'orange' },
                { label: 'Payées (Wave)', value: reservations.filter(r => r.statut === 'paid').length, color: 'blue' },
                { label: 'Confirmées', value: reservations.filter(r => r.statut === 'confirmed').length, color: 'green' },
                { label: 'Chiffre Affaires', value: (reservations.reduce((s, r) => s + (r.montant || 0), 0) / 1000).toFixed(0) + 'K', color: 'gold' }
              ].map((kpi, i) => (
                <div key={i} className="bg-white/5 border border-gold/15 p-6 rounded-sm">
                  <div className="text-[10px] tracking-widest uppercase text-white/30 mb-2">{kpi.label}</div>
                  <div className={`font-serif text-3xl text-${kpi.color}`}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex gap-2">
                {['all', 'new', 'paid', 'confirmed', 'done', 'cancelled'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all border ${filter === f ? 'bg-gold/20 border-gold text-gold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                <input 
                  type="text" 
                  placeholder="Rechercher nom, réf..." 
                  className="input-field !py-2 !pl-10 text-sm"
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/5 border border-gold/15 rounded-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/30 text-[10px] tracking-widest uppercase">
                      <th className="p-4 font-medium">Réf</th>
                      <th className="p-4 font-medium">Client</th>
                      <th className="p-4 font-medium">E-mail</th>
                      <th className="p-4 font-medium">Service</th>
                      <th className="p-4 font-medium">Paiement</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Montant</th>
                      <th className="p-4 font-medium">Statut</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-gold font-mono text-xs">{r.id}</td>
                        <td className="p-4">
                          <div className="text-white font-medium">{r.nom}</div>
                          <div className="text-[10px] text-white/30">{r.whatsapp}</div>
                        </td>
                        <td className="p-4 text-white/60 text-xs">{r.email}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border w-fit ${r.type === 'transfert' ? 'border-blue/30 text-blue bg-blue/10' : r.type === 'dispo' ? 'border-purple/30 text-purple bg-purple/10' : 'border-orange/30 text-orange bg-orange/10'}`}>
                              {r.type} {r.isRoundTrip ? '(AR)' : ''}
                            </span>
                            {r.type === 'location' && (
                              <span className="text-[9px] text-white/30 italic">
                                {r.locationZone === 'dakar' ? 'Dakar' : 'Hors Dakar'} • {r.withDriver ? 'Chauffeur' : 'Sans Chauffeur'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] text-gold uppercase font-medium">{r.paymentMethod}</span>
                        </td>
                        <td className="p-4 text-white/60 text-xs">{r.date || r.debut || '—'}</td>
                        <td className="p-4 text-gold-light font-serif">{r.montant?.toLocaleString('fr-FR')} FCFA</td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            r.statut === 'new' ? 'border-orange/30 text-orange bg-orange/10' :
                            r.statut === 'paid' ? 'border-blue/30 text-blue bg-blue/10' :
                            r.statut === 'confirmed' ? 'border-green/30 text-green bg-green/10' :
                            r.statut === 'done' ? 'border-gold/30 text-gold bg-gold/10' :
                            'border-red/30 text-red bg-red/10'
                          }`}>
                            {r.statut}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <div className="flex items-center justify-end gap-1 mb-2">
                            <a 
                              href={`https://wa.me/${r.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Confirmation ElleDrives ✨\n\nBonjour ${r.nom},\n\nVotre réservation est confirmée !\n\nRéf : ${r.id}\nDate : ${r.date || r.debut}\nMontant : ${r.montant?.toLocaleString()} FCFA\n\nMerci de votre confiance !`)}`}
                              target="_blank"
                              className="p-1.5 rounded-sm bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                            <a 
                              href={`sms:${r.whatsapp.replace(/[^0-9]/g, '')}?body=${encodeURIComponent(`ElleDrives: Confirmation Ref ${r.id}. Votre trajet du ${r.date || r.debut} est confirme. Merci!`)}`}
                              className="p-1.5 rounded-sm bg-blue/10 text-blue hover:bg-blue/20 transition-colors"
                              title="SMS"
                            >
                              <Phone size={14} />
                            </a>
                            {r.email && (
                              <a 
                                href={`mailto:${r.email}?subject=Confirmation ElleDrives - ${r.id}&body=${encodeURIComponent(`Bonjour ${r.nom},\n\nNous confirmons votre réservation ElleDrives.\n\nRéférence : ${r.id}\nDate : ${r.date || r.debut}\nMontant : ${r.montant?.toLocaleString()} FCFA\n\nÀ très bientôt !`)}`}
                                className="p-1.5 rounded-sm bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                                title="Email"
                              >
                                <Mail size={14} />
                              </a>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => setEditingRes(r)} 
                            className="text-white/40 hover:text-gold p-1.5 rounded-sm transition-colors" 
                            title="Modifier"
                          >
                            <Settings size={16} />
                          </button>
                          
                          <div className="inline-flex gap-1 border-l border-white/10 pl-2 ml-2">
                            <button onClick={() => updateStatus(r.id, 'confirmed')} className={`p-1.5 rounded-sm transition-colors ${r.statut === 'confirmed' ? 'text-green bg-green/10' : 'text-white/20 hover:text-green'}`} title="Confirmer">
                              <CheckCircle2 size={16} />
                            </button>
                            <button onClick={() => updateStatus(r.id, 'done')} className={`p-1.5 rounded-sm transition-colors ${r.statut === 'done' ? 'text-gold bg-gold/10' : 'text-white/20 hover:text-gold'}`} title="Terminer">
                              <Star size={16} />
                            </button>
                            <button onClick={() => updateStatus(r.id, 'cancelled')} className={`p-1.5 rounded-sm transition-colors ${r.statut === 'cancelled' ? 'text-red bg-red/10' : 'text-white/20 hover:text-red'}`} title="Annuler">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="p-20 text-center text-white/20 text-sm italic">Aucune réservation trouvée.</div>
              )}
            </div>
          </>
        ) : activeTab === 'tourisme' ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Camera className="text-gold" />
                <h3 className="font-serif text-2xl text-white">Gestion Tourisme</h3>
              </div>
              <div className="flex gap-4">
                <button onClick={handleResetTouristSites} className="text-[10px] text-white/20 hover:text-gold uppercase tracking-widest">Réinitialiser</button>
                <button onClick={addSite} className="btn-primary !py-2 !px-4 text-[10px]">Ajouter un site</button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {touristSites.map(site => (
                <div key={site.id} className="bg-white/5 border border-gold/15 rounded-sm overflow-hidden group">
                  <div className="aspect-video relative">
                    <img src={site.img} alt={site.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => setEditingSite(site)} className="p-2 bg-gold text-dark rounded-full hover:bg-gold-light transition-colors"><Settings size={16} /></button>
                      <button onClick={() => deleteSite(site.id)} className="p-2 bg-red text-white rounded-full hover:bg-red/80 transition-colors"><X size={16} /></button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-white font-serif text-lg mb-1">{site.title}</h4>
                    <p className="text-white/40 text-xs line-clamp-2">{site.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {editingSite && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[400] bg-dark/95 backdrop-blur-md flex items-center justify-center p-6"
                >
                  <div className="max-w-xl w-full bg-dark border border-gold/20 p-8 rounded-sm">
                    <h3 className="font-serif text-2xl text-gold mb-8">Modifier le site</h3>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label className="label-field">Titre</label>
                        <input 
                          type="text" 
                          value={editingSite.title} 
                          className="input-field" 
                          onChange={e => setEditingSite({ ...editingSite, title: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="label-field">Image</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="text" 
                            value={editingSite.img} 
                            className="input-field flex-1" 
                            placeholder="URL de l'image"
                            onChange={e => setEditingSite({ ...editingSite, img: e.target.value })} 
                          />
                          <label className="btn-outline cursor-pointer whitespace-nowrap text-[10px] !py-2">
                            <Upload size={14} className="inline mr-2" /> Upload
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setAdminLoading("Optimisation de l'image...");
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    const compressed = await compressImage(reader.result as string, 1200, 800, 0.7);
                                    setEditingSite({ ...editingSite, img: compressed });
                                    setAdminLoading(null);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="label-field">Description</label>
                        <textarea 
                          value={editingSite.desc} 
                          rows={4}
                          className="input-field resize-none" 
                          onChange={e => setEditingSite({ ...editingSite, desc: e.target.value })} 
                        />
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => saveSite(editingSite)} className="btn-primary flex-1">Enregistrer</button>
                        <button onClick={() => setEditingSite(null)} className="btn-outline flex-1">Annuler</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeTab === 'content' ? (
          <div className="space-y-12 animate-fade-up">
            {/* Hero Section */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <Camera className="text-gold" />
                <h3 className="font-serif text-2xl text-white">Section Accueil (Hero)</h3>
              </div>

              <div className="bg-white/5 border border-gold/15 p-8 rounded-sm space-y-8">
                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Image d'arrière-plan</h4>
                  <div className="flex flex-col gap-4">
                    <div className="aspect-video w-full rounded-sm border border-gold/20 bg-gold/5 flex items-center justify-center overflow-hidden">
                      <img src={localHeroImage} alt="Hero Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="btn-outline cursor-pointer inline-flex items-center gap-2 text-[10px] flex-1 justify-center">
                        <Upload size={14} /> Charger une image
                        <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                      </label>
                      <button 
                        onClick={() => setLocalHeroImage('https://pepiniere.sn/wp-content/uploads/2025/03/baobab.webp')}
                        className="text-[10px] text-white/40 hover:text-gold transition-colors"
                      >
                        Réinitialiser (Baobab)
                      </button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button 
                        onClick={() => onUpdateHero(localHeroImage)}
                        className="btn-primary !py-2 !px-6 text-[10px]"
                      >
                        Enregistrer l'image hero
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase">Slogan (Badge)</label>
                    <input 
                      type="text" 
                      value={localHeroSubtitle} 
                      className="input-field" 
                      onChange={e => setLocalHeroSubtitle(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase">Titre Principal (Utilisez \n pour les retours à la ligne)</label>
                    <textarea 
                      value={localHeroTitle} 
                      rows={3}
                      className="input-field resize-none" 
                      onChange={e => setLocalHeroTitle(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => onUpdateHeroText(localHeroTitle, localHeroSubtitle)}
                    className="btn-primary !py-2 !px-6 text-[10px]"
                  >
                    Enregistrer les textes
                  </button>
                </div>
              </div>
            </div>

            {/* Services Section */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="text-gold" />
                <h3 className="font-serif text-2xl text-white">Nos Services</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {localServices.map((s, idx) => (
                  <div key={s.id} className="bg-white/5 border border-gold/15 p-6 rounded-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gold text-[10px] uppercase tracking-widest">Service {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <select 
                          value={s.icon} 
                          className="bg-dark border border-gold/20 text-white text-[10px] rounded p-1"
                          onChange={e => {
                            const updated = [...localServices];
                            updated[idx] = { ...s, icon: e.target.value as any };
                            setLocalServices(updated);
                          }}
                        >
                          <option value="plane">Avion</option>
                          <option value="clock">Horloge</option>
                          <option value="key">Clé</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={s.title} 
                        className="input-field text-sm" 
                        placeholder="Titre"
                        onChange={e => {
                          const updated = [...localServices];
                          updated[idx] = { ...s, title: e.target.value };
                          setLocalServices(updated);
                        }}
                      />
                      <textarea 
                        value={s.desc} 
                        rows={3}
                        className="input-field text-xs resize-none" 
                        placeholder="Description"
                        onChange={e => {
                          const updated = [...localServices];
                          updated[idx] = { ...s, desc: e.target.value };
                          setLocalServices(updated);
                        }}
                      />
                      <input 
                        type="text" 
                        value={s.price} 
                        className="input-field text-xs" 
                        placeholder="Prix (ex: À partir de...)"
                        onChange={e => {
                          const updated = [...localServices];
                          updated[idx] = { ...s, price: e.target.value };
                          setLocalServices(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => onUpdateServices(localServices)}
                  className="btn-primary !py-2 !px-6 text-[10px]"
                >
                  Enregistrer les services
                </button>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <Star className="text-gold" />
                <h3 className="font-serif text-2xl text-white">Avis Clients</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {localReviews.map((r, idx) => (
                  <div key={r.id} className="bg-white/5 border border-gold/15 p-6 rounded-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gold text-[10px] uppercase tracking-widest">Avis {idx + 1}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star}
                            onClick={() => {
                              const updated = [...localReviews];
                              updated[idx] = { ...r, rating: star };
                              setLocalReviews(updated);
                            }}
                          >
                            <Star size={10} className={star <= r.rating ? "fill-gold text-gold" : "text-white/20"} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={r.name} 
                        className="input-field text-sm" 
                        placeholder="Nom"
                        onChange={e => {
                          const updated = [...localReviews];
                          updated[idx] = { ...r, name: e.target.value };
                          setLocalReviews(updated);
                        }}
                      />
                      <input 
                        type="text" 
                        value={r.meta} 
                        className="input-field text-xs" 
                        placeholder="Méta (ex: Paris → Dakar)"
                        onChange={e => {
                          const updated = [...localReviews];
                          updated[idx] = { ...r, meta: e.target.value };
                          setLocalReviews(updated);
                        }}
                      />
                      <textarea 
                        value={r.text} 
                        rows={4}
                        className="input-field text-xs resize-none" 
                        placeholder="Commentaire"
                        onChange={e => {
                          const updated = [...localReviews];
                          updated[idx] = { ...r, text: e.target.value };
                          setLocalReviews(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => onUpdateReviews(localReviews)}
                  className="btn-primary !py-2 !px-6 text-[10px]"
                >
                  Enregistrer les avis
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-10 animate-fade-up">
            {/* Price Settings */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="text-gold" />
                <h3 className="font-serif text-2xl text-white">Gestion des Tarifs</h3>
              </div>

              <div className="bg-white/5 border border-gold/15 p-8 rounded-sm space-y-6">
                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Transferts Aéroport (Base)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Dakar Centre</label>
                      <input type="number" value={localPrices.transfert.dakarCentre} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, dakarCentre: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Almadies / Ngor</label>
                      <input type="number" value={localPrices.transfert.almadies} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, almadies: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Diamniadio</label>
                      <input type="number" value={localPrices.transfert.diamniadio} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, diamniadio: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Saly / Mbour</label>
                      <input type="number" value={localPrices.transfert.saly} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, saly: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Bandia</label>
                      <input type="number" value={localPrices.transfert.bandia} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, bandia: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Lompoul</label>
                      <input type="number" value={localPrices.transfert.lompoul} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, lompoul: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Thiès</label>
                      <input type="number" value={localPrices.transfert.thies} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, thies: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Saint Louis</label>
                      <input type="number" value={localPrices.transfert.saintLouis} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, saintLouis: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Louga</label>
                      <input type="number" value={localPrices.transfert.louga} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, louga: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Kaolack</label>
                      <input type="number" value={localPrices.transfert.kaolack} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, kaolack: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Somone</label>
                      <input type="number" value={localPrices.transfert.somone} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, somone: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Lac Rose</label>
                      <input type="number" value={localPrices.transfert.lacRose} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, lacRose: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Saloum</label>
                      <input type="number" value={localPrices.transfert.saloum} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, saloum: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Touba</label>
                      <input type="number" value={localPrices.transfert.touba} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, touba: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Tivaouane</label>
                      <input type="number" value={localPrices.transfert.tivaouane} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, tivaouane: parseInt(e.target.value)}})} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Suppléments SUV / Van</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Dakar Centre (+)</label>
                      <input type="number" value={localPrices.transfert.dakarCentreSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, dakarCentreSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Almadies / Ngor (+)</label>
                      <input type="number" value={localPrices.transfert.almadiesSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, almadiesSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Diamniadio (+)</label>
                      <input type="number" value={localPrices.transfert.diamniadioSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, diamniadioSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Saly / Mbour (+)</label>
                      <input type="number" value={localPrices.transfert.salySUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, salySUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Bandia (+)</label>
                      <input type="number" value={localPrices.transfert.bandiaSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, bandiaSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Lompoul (+)</label>
                      <input type="number" value={localPrices.transfert.lompoulSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, lompoulSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Thiès (+)</label>
                      <input type="number" value={localPrices.transfert.thiesSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, thiesSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Saint Louis (+)</label>
                      <input type="number" value={localPrices.transfert.saintLouisSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, saintLouisSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Louga (+)</label>
                      <input type="number" value={localPrices.transfert.lougaSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, lougaSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Kaolack (+)</label>
                      <input type="number" value={localPrices.transfert.kaolackSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, kaolackSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Somone (+)</label>
                      <input type="number" value={localPrices.transfert.somoneSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, somoneSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Lac Rose (+)</label>
                      <input type="number" value={localPrices.transfert.lacRoseSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, lacRoseSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Saloum (+)</label>
                      <input type="number" value={localPrices.transfert.saloumSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, saloumSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Touba (+)</label>
                      <input type="number" value={localPrices.transfert.toubaSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, toubaSUV: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Tivaouane (+)</label>
                      <input type="number" value={localPrices.transfert.tivaouaneSUV} className="input-field" onChange={e => setLocalPrices({...localPrices, transfert: {...localPrices.transfert, tivaouaneSUV: parseInt(e.target.value)}})} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Mise à Disposition</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Demi-journée (4h)</label>
                      <input type="number" value={localPrices.dispo.demiJournee} className="input-field" onChange={e => setLocalPrices({...localPrices, dispo: {...localPrices.dispo, demiJournee: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Journée (8h)</label>
                      <input type="number" value={localPrices.dispo.journee} className="input-field" onChange={e => setLocalPrices({...localPrices, dispo: {...localPrices.dispo, journee: parseInt(e.target.value)}})} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Location / jour</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Berline</label>
                      <input type="number" value={localPrices.location.berline} className="input-field" onChange={e => setLocalPrices({...localPrices, location: {...localPrices.location, berline: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">SUV</label>
                      <input type="number" value={localPrices.location.suv} className="input-field" onChange={e => setLocalPrices({...localPrices, location: {...localPrices.location, suv: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Luxe</label>
                      <input type="number" value={localPrices.location.luxe} className="input-field" onChange={e => setLocalPrices({...localPrices, location: {...localPrices.location, luxe: parseInt(e.target.value)}})} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Bouquets Accueil</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Petit</label>
                      <input type="number" value={localPrices.bouquets.small} className="input-field" onChange={e => setLocalPrices({...localPrices, bouquets: {...localPrices.bouquets, small: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Moyen</label>
                      <input type="number" value={localPrices.bouquets.medium} className="input-field" onChange={e => setLocalPrices({...localPrices, bouquets: {...localPrices.bouquets, medium: parseInt(e.target.value)}})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Grand</label>
                      <input type="number" value={localPrices.bouquets.large} className="input-field" onChange={e => setLocalPrices({...localPrices, bouquets: {...localPrices.bouquets, large: parseInt(e.target.value)}})} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => onUpdatePrices(localPrices)}
                    className="btn-primary !py-2 !px-6 text-[10px]"
                  >
                    Enregistrer les tarifs
                  </button>
                </div>
              </div>
            </div>

            {/* Profile & Social Settings */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="text-gold" />
                <h3 className="font-serif text-2xl text-white">Identité & Profil</h3>
              </div>

              <div className="bg-white/5 border border-gold/15 p-8 rounded-sm space-y-8">
                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Logo de l'entreprise</h4>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-sm border border-gold/20 bg-gold/5 flex items-center justify-center overflow-hidden p-2">
                      {localLogo ? (
                        <img src={localLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Logo className="scale-75" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="btn-outline cursor-pointer inline-flex items-center gap-2 text-[10px]">
                        <Upload size={14} /> Choisir un logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <p className="text-[10px] text-white/20 mt-2">Format PNG transparent recommandé.</p>
                      <div className="flex justify-start mt-4">
                        <button 
                          onClick={() => onUpdateLogo(localLogo)}
                          className="btn-primary !py-2 !px-6 text-[10px]"
                        >
                          Enregistrer le logo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Photo de Khady</h4>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-2 border-gold bg-gold/10 flex items-center justify-center overflow-hidden">
                      {localFounderPhoto ? (
                        <img src={localFounderPhoto} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">👩🏾‍💼</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="btn-outline cursor-pointer inline-flex items-center gap-2 text-[10px]">
                        <Upload size={14} /> Choisir une photo
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                      <p className="text-[10px] text-white/20 mt-2">Format JPG/PNG recommandé.</p>
                      <div className="flex justify-start mt-4">
                        <button 
                          onClick={() => onUpdatePhoto(localFounderPhoto)}
                          className="btn-primary !py-2 !px-6 text-[10px]"
                        >
                          Enregistrer la photo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Nom TikTok</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase">Identifiant (sans @)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={localTiktokName} 
                        className="input-field" 
                        onChange={e => setLocalTiktokName(e.target.value)} 
                      />
                      <button 
                        onClick={() => onUpdateTiktok(localTiktokName)}
                        className="btn-primary !py-2 !px-6 text-[10px] whitespace-nowrap"
                      >
                        Enregistrer TikTok
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'backups' && (
          <div className="space-y-10">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-gold" />
              <h3 className="font-serif text-2xl text-white">Sauvegardes & Export</h3>
            </div>
            
            <div className="bg-white/5 border border-gold/15 p-8 rounded-sm space-y-8">
              <div>
                <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Exportation Manuelle</h4>
                <p className="text-white/60 text-sm mb-6 max-w-2xl">
                  Téléchargez une copie complète de toutes vos données (réservations, tarifs, services, avis et configuration du site) au format JSON. Ce fichier peut être utilisé pour restaurer vos données ou les consulter hors-ligne.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={handleExportData}
                    className="btn-primary flex items-center gap-3"
                  >
                    <Upload className="rotate-180" size={18} /> Exporter toutes les données
                  </button>
                  <label className="btn-outline cursor-pointer flex items-center gap-3">
                    <Upload size={18} /> Importer / Restaurer
                    <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                  </label>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <h4 className="text-gold text-xs uppercase tracking-widest mb-4">Sauvegardes Automatiques (Firebase)</h4>
                <p className="text-white/60 text-sm mb-4 max-w-2xl">
                  Votre base de données Firestore bénéficie de sauvegardes automatiques gérées par Google Cloud. 
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-dark/30 p-6 border border-white/5 rounded-sm">
                    <div className="text-gold text-[10px] uppercase tracking-widest mb-2 font-bold">Point-in-Time Recovery</div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Permet de restaurer la base de données à n'importe quel moment précis des 7 derniers jours. (Nécessite un plan Blaze).
                    </p>
                  </div>
                  <div className="bg-dark/30 p-6 border border-white/5 rounded-sm">
                    <div className="text-gold text-[10px] uppercase tracking-widest mb-2 font-bold">Exports Planifiés</div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Vous pouvez configurer des exports quotidiens vers Google Cloud Storage via la console Firebase.
                    </p>
                  </div>
                </div>
                <a 
                  href="https://console.firebase.google.com/project/elledrives/firestore/databases/(default)/backups" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-6 text-gold text-[10px] uppercase tracking-widest hover:underline"
                >
                  Accéder aux paramètres de sauvegarde Firebase →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
