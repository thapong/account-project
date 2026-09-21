"use client";
import { useState } from "react";
import { createBillingNote } from "@/lib/documents/actions";
export default function CreateBillingNoteForm({ invoices }: { invoices: { id:string; invoice_no:string; customer_name:string; grand_total:string }[] }) {
  const [selected,setSelected]=useState<string[]>([]); const [message,setMessage]=useState("");
  async function submit(){ const r=await createBillingNote(selected); setMessage(r.ok?"สร้างใบวางบิลแล้ว":r.error??"ไม่สำเร็จ"); if(r.ok) location.reload(); }
  return <div className="space-y-3"><div className="space-y-2">{invoices.map(i=><label key={i.id} className="flex items-center gap-3 rounded border p-3"><input type="checkbox" checked={selected.includes(i.id)} onChange={e=>setSelected(e.target.checked?[...selected,i.id]:selected.filter(x=>x!==i.id))}/><span className="flex-1"><b>{i.invoice_no}</b> · {i.customer_name}</span><span>{Number(i.grand_total).toLocaleString("th-TH",{minimumFractionDigits:2})} บาท</span></label>)}</div><button className="btn-primary" disabled={!selected.length} onClick={submit}>สร้างใบวางบิล</button>{message&&<p className="text-sm">{message}</p>}</div>;
}
