import {
  Phone, LayoutDashboard, Users, BarChart3, MessageSquare,
  Activity, CreditCard, Radio, MessagesSquare, Hash, UserCog,
  List, Tag, ListChecks, FileText, PhoneCall, Voicemail, Layers,
  ShieldCheck, PieChart, MinusCircle, Mail, Building2,
  Headphones, Globe, Bot, Calendar, Mic, Inbox, BrainCircuit,
  Settings2, User, Wifi, DollarSign, BookMarked, Plug2,
  Target, Clock, CalendarDays, RefreshCw, FileSearch, Link2, Zap,
  CheckCircle2,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>

const ICON_MAP: Record<string, IconComponent> = {
  Phone,
  LayoutDashboard,
  Users,
  BarChart3,
  MessageSquare,
  Activity,
  CreditCard,
  Radio,
  MessagesSquare,
  Hash,
  UserCog,
  List,
  Tag,
  ListChecks,
  FileText,
  PhoneCall,
  Voicemail,
  Layers,
  ShieldCheck,
  PieChart,
  MinusCircle,
  Mail,
  Building2,
  Headphones,
  Globe,
  Bot,
  Calendar,
  Mic,
  Inbox,
  BrainCircuit,
  Settings2,
  User,
  Wifi,
  DollarSign,
  BookMarked,
  Plug2,
  Target,
  Clock,
  CalendarDays,
  RefreshCw,
  FileSearch,
  Link2,
  Zap,
  CheckCircle2,
}

/**
 * Resolve a Lucide icon name string to its React component.
 * Falls back to LayoutDashboard if the name is not found.
 */
export function resolveIcon(name: string | null | undefined): IconComponent {
  if (!name) return LayoutDashboard
  return ICON_MAP[name] ?? LayoutDashboard
}
