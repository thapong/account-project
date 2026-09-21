export interface SubMenuItem {
  name: string;
  url: string;
  isPro?: boolean;
}

export interface MenuItem {
  name: string;
  icon: string;
  url?: string;
  isPro?: boolean;
  children?: SubMenuItem[];
}

export interface MenuGroup {
  heading: string;
  children: MenuItem[];
}
