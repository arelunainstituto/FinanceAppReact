import MbWayIcon from '../../assets/mb_way.png';
import MultibancoIcon from '../../assets/multibanco.png';

export interface PaymentMethodOption {
  value: string;
  label: string;
  icon?: any;
  isCustomImage?: boolean;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'DD', label: 'DD', icon: 'card-outline', isCustomImage: false },
  { value: 'TRF', label: 'Transferência', icon: 'swap-horizontal-outline', isCustomImage: false },
  { value: 'Stripe', label: 'Stripe', icon: 'card-outline', isCustomImage: false },
  { value: 'PP', label: 'PP', icon: 'logo-paypal', isCustomImage: false },
  { value: 'Receção', label: 'Receção', icon: 'receipt-outline', isCustomImage: false },
  { value: 'TRF ou RECEÇÃO', label: 'TRF ou Receção', icon: 'git-compare-outline', isCustomImage: false },
  { value: 'TRF - OP', label: 'TRF - OP', icon: 'swap-horizontal-outline', isCustomImage: false },
  { value: 'bank_transfer', label: 'Transferência Bancária', icon: 'business-outline', isCustomImage: false },
  { value: 'Cheque', label: 'Cheque', icon: 'document-text-outline', isCustomImage: false },
  { value: 'Cheque/Misto', label: 'Cheque/Misto', icon: 'documents-outline', isCustomImage: false },
  { value: 'Aditamento', label: 'Aditamento', icon: 'add-circle-outline', isCustomImage: false },
  { value: 'DD + TB', label: 'DD + TB', icon: 'layers-outline', isCustomImage: false },
  { value: 'Ordenado', label: 'Ordenado', icon: 'wallet-outline', isCustomImage: false },
  { value: 'Numerário', label: 'Numerário', icon: 'cash-outline', isCustomImage: false },
  { value: 'multibanco', label: 'Multibanco', icon: MultibancoIcon, isCustomImage: true },
  { value: 'mbway', label: 'MB WAY', icon: MbWayIcon, isCustomImage: true },
];

