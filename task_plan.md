# แผนออกแบบระบบงานขาย

สถานะ: เริ่ม implementation ตามคำสั่งผู้ใช้ โดยใช้ template เดิมและ Luna subagents

- [x] ตรวจโครงสร้างโปรเจกต์และ Excel ทั้ง 3 ไฟล์
- [x] ตรวจหัวเอกสาร รายการสินค้า และปัญหาที่ต้องจัดการตอนนำเข้า
- [x] ออกแบบ PostgreSQL ระดับตาราง ความสัมพันธ์ และข้อกำหนดความถูกต้อง
- [x] วางแผนโมดูล ลำดับพัฒนา การนำเข้า และเกณฑ์ทดสอบ
- [ ] ยืนยันความหมาย Invoice เทียบกับใบแจ้งหนี้ และกติกาธุรกิจที่ระบุในแผน
- [x] จัดทำ migration และเริ่มพัฒนาตามขอบเขตที่ตกลง

เอกสารหลัก: [แบบฐานข้อมูล](docs/database-design.md) และ [แผนพัฒนา](docs/application-plan.md)

## รูปแบบการทำงานตามที่ผู้ใช้กำหนด

- Agent หลักวางแผน ระบุขอบเขตไฟล์ สัญญาข้อมูล และเกณฑ์ตรวจรับก่อนมอบหมาย
- ใช้ subagent โมเดล `gpt-5.6-luna` ทำงานแต่ละส่วน โดยแยกผู้รับผิดชอบไฟล์และไม่แก้ไฟล์ร่วมกันพร้อมกัน
- Agent หลักตรวจ diff ให้ตรงแบบ ตรวจการเชื่อมกันของโมดูล และรัน lint/build พร้อมทดสอบกติกาธุรกิจที่เกี่ยวข้องด้วยตนเอง
- งานหน้าจอต้องตรวจบน browser โดยใช้ web template เดิม และงานฐานข้อมูลต้องมีผล query จริง ไม่ใช้เพียงผลตรวจ TCP เป็นหลักฐานว่าเชื่อมต่อสำเร็จ
- หากไม่ผ่านเกณฑ์ Agent หลักส่งข้อแก้ไขให้ Luna และตรวจซ้ำก่อนรับงาน

ลำดับแบ่งงาน: เชื่อมต่อฐานข้อมูลและ migration → ผู้ใช้/สิทธิ์และข้อมูลบริษัท → ลูกค้า/สินค้า → Price List → ใบเสนอราคา → Invoice/ใบวางบิลตามความหมายที่ยืนยัน

ผลตรวจความพร้อมล่าสุด: พอร์ต localhost:5432 เปิด แต่ยังไม่มี PostgreSQL client ใน dependencies และยังไม่มีผล login/query สำเร็จ; template มีอยู่แล้วและยังต้องพัฒนา business modules

## งาน implementation รอบแรก

- [x] Agent หลัก: dependencies, DB connection/migrations, integration contract, dashboard/navigation, นำเข้าข้อมูลลูกค้าจาก Excel อย่างตรวจสอบได้
- [x] Luna auth: login/setup/logout, session, role checks, user management
- [ ] Luna masters: ลูกค้า สินค้า และรายการราคาที่บันทึกใน PostgreSQL (โค้ดชุดแรกอยู่แล้ว แต่ยังต้องตรวจแก้ flow หลัง agent หยุดเพราะโควตา)
- [x] Luna documents: ใบเสนอราคา คำนวณราคา เปลี่ยนสถานะ ออก Invoice และใบวางบิล พร้อมหน้าพิมพ์ (ต้องทำ UAT หลังตั้ง admin)
- [x] Agent หลัก: ตรวจ authorization/validation, typecheck, lint, build และ browser setup/login flow

ขอบเขตรอบแรก: บริษัทเดียว THB, Invoice=ใบแจ้งหนี้ตามสมมติฐาน, ใบวางบิลยังไม่ใช่บัญชีรับชำระ, ไม่เปิดใช้ใบกำกับภาษี/รับเงิน/e-Tax; หากส่วนใดยังไม่ครบให้รายงานตามจริง ห้ามสร้างหน้าจอที่อ้างว่าบันทึกแล้วทั้งที่เป็นข้อมูลจำลอง

สถานะ implementation รอบแรก: migration 001–004 รันสำเร็จ, vector extension 0.8.6 เปิดใช้งาน, ลูกค้า 54 รายถูกนำเข้าแล้วพร้อม source row provenance, `npm run typecheck`, `npm run lint`, `npm run build` ผ่าน; `npm test` ยังติดข้อจำกัด ENOMEM ของ Node/tsx ใน environment และต้องทำ UAT หลังยืนยัน admin credentials

สัญญาระหว่าง agent: [implementation-contract.md](docs/implementation-contract.md)
