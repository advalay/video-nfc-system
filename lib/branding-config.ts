export interface BrandingConfig {
  companyName: {
    enabled: boolean;
    text: string;
    position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    fontSize: string;
  };
  logo: {
    enabled: boolean;
    imageUrl: string;
    altText: string;
    width: number;
    height: number;
    position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  };
  watermark: {
    enabled: boolean;
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
  };
  footer: {
    enabled: boolean;
    text: string;
    link?: {
      url: string;
      text: string;
    };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  customStyles?: string;
}

export function getBrandingConfig(organizationId?: string): BrandingConfig {
  return {
    companyName: {
      enabled: true,
      text: '動画配信システム',
      position: 'top-left',
      fontSize: 'text-lg'
    },
    logo: {
      enabled: false,
      imageUrl: '/logo.png',
      altText: 'ロゴ',
      width: 100,
      height: 50,
      position: 'top-left'
    },
    watermark: {
      enabled: false,
      text: '',
      position: 'bottom-right',
      opacity: 0.5
    },
    footer: {
      enabled: false,
      text: ''
    },
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#F59E0B',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280'
    }
  };
}

export const brandingConfig = {
  companyName: '動画配信システム',
  logo: '/logo.png',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  theme: {
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#F59E0B',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280'
    }
  }
};
