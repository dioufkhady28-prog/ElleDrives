export type ReservationType = 'transfert' | 'dispo' | 'location';
export type ReservationStatus = 'new' | 'confirmed' | 'done' | 'cancelled' | 'paid';

export interface Reservation {
  id: string;
  type: ReservationType;
  nom: string;
  email: string;
  whatsapp: string;
  statut: ReservationStatus;
  createdAt: string;
  montant: number;
  paymentMethod?: 'wave' | 'cash' | 'card';
  
  // Transfert specific
  date?: string;
  heure?: string;
  vol?: string;
  from?: string;
  dest?: string;
  pax?: string;
  bag?: string;
  sieges?: number;
  valises?: number;
  extras?: string[];
  isRoundTrip?: boolean;

  // Dispo specific
  duree?: string;
  zone?: string;
  objet?: string;

  // Location specific
  debut?: string;
  fin?: string;
  heureDebut?: string;
  heureFin?: string;
  nbJours?: number;
  vehicule?: string;
  tarifJour?: number;
  permis?: string;
  ville?: string;
  notes?: string;
  conditionsAcceptees?: boolean;
  retourConfirme?: boolean;
  retourDate?: string;
  penalite?: number;
  withDriver?: boolean;
  locationZone?: 'dakar' | 'hors-dakar';

  // Feedback
  rating?: number;
  feedback?: string;
}

export interface TouristSite {
  id: string;
  title: string;
  desc: string;
  img: string;
  order?: number;
}
