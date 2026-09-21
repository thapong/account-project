import type { MenuGroup } from "@/types/navigation";
export const sidebarData: MenuGroup[] = [
  { heading: "พื้นที่ทำงาน", children: [
    { name: "ภาพรวม", icon: "solar:widget-add-line-duotone", url: "/" },
    { name: "ลูกค้า", icon: "solar:users-group-rounded-linear", url: "/customers" },
    { name: "สินค้าและบริการ", icon: "solar:box-linear", url: "/products" },
    { name: "Price List", icon: "solar:tag-price-linear", url: "/price-lists" },
  ]},
  { heading: "เอกสารการขาย", children: [
    { name: "ใบเสนอราคา", icon: "solar:document-text-linear", url: "/quotations" },
    { name: "ใบแจ้งหนี้ / Invoice", icon: "solar:bill-list-linear", url: "/invoices" },
    { name: "ใบวางบิล", icon: "solar:clipboard-list-linear", url: "/billing-notes" },
  ]},
  { heading: "จัดการระบบ", children: [
    { name: "ผู้ใช้งาน", icon: "solar:user-id-linear", url: "/users" },
    { name: "ตั้งค่าบริษัท", icon: "solar:settings-linear", url: "/settings" },
  ]},
];
