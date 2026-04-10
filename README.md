# AISCAN - AI Procurement Auditing Platform

AISCAN — bu davlat va korporativ xaridlar hujjatlarini (Texnik topshiriqlar, shartnomalar, tijorat takliflari) sun'iy intellekt (Gemini 2.0 Flash / Pro) yordamida chuqur tahlil qilish va audit qilish uchun mo'ljallangan professional platforma.

## 🚀 Asosiy Imkoniyatlar

- **Meticulous Per-Clause Audit**: Har bir bandni alohida va sinchkovlik bilan tekshirish.
- **Ko'p tillilik (Multilingual)**: O'zbek, Rus va Ingliz tillarida to'liq tahlil va kesh tizimi.
- **Affiliatsiya Tahlili**: Turli kompaniyalar o'rtasidagi yashirin bog'liqliklarni (ta'sischilar, STIR) aniqlash.
- **Market Tahlili**: Texnik talablar asosida bozordan mos kompaniyalar va o'rtacha narxlarni topish.
- **Admin Panel**: Foydalanuvchilarni boshqarish, ichki nizomlarni yuklash va barcha tahlillarni kuzatish.
- **Xavfsizlik**: Ma'lumotlar PostgreSQL bazasida Prisma ORM orqali xavfsiz va optimallashgan holda saqlanadi.

## 🛠 Texnologiyalar

- **Frontend/Backend**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Sun'iy Intellekt**: [Google Gemini 2.0 Flash API](https://ai.google.dev/)
- **Ma'lumotlar bazasi**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma 7 (Driver Adapter model)](https://www.prisma.io/)
- **Stilizatsiya**: Glassmorphism UI (Vanilla CSS)
- **Autentifikatsiya**: Iron Session

## 📦 O'rnatish va Ishga tushirish

1. **Repozitoriyani yuklab oling:**
   ```bash
   git clone https://github.com/Elbekjon95/aiscan2.git
   cd aiscan2
   ```

2. **Kutubxonalarni o'rnating:**
   ```bash
   npm install
   ```

3. **Muhit o'zgaruvchilarini sozlang:**
   Loyihaning ildiz papkasida `.env` faylini yarating va quyidagi ma'lumotlarni kiriting:
   ```env
   # Open Server Panel 6 uchun misol (IP manzilingizni \conninfo orqali tekshiring)
   DATABASE_URL="postgresql://postgres:root@127.127.126.49:5432/aiscan_db?schema=public"
   
   GEMINI_API_KEY=Sizning_API_Kalitingiz
   SESSION_SECRET=kamida_32_belgili_maxfiy_satr
   ```

4. **Ma'lumotlar bazasini tayyorlash:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Loyiha ishga tushiring:**
   ```bash
   npm run dev
   ```
   Loyiha [http://localhost:3000](http://localhost:3000) manzilida ochiladi.

## 📁 Loyiha Strukturasi

- `/app`: Sahifalar va API yo'llari (Next.js App Router).
- `/components`: Qayta ishlatiladigan UI komponentlar.
- `/lib`: Prisma Client, ulanishlar va tarjimalar.
- `/prisma`: Ma'lumotlar bazasi sxemasi (`schema.prisma`).
- `/public`: Rasmlar, fontlar va global CSS uslublari.

## 🔐 Admin Panel va Birinchi kirish

Admin panelga kirish uchun `/admin/login` sahifasiga o'ting.

> [!TIP]
> **Ilk kirish:** Tizimda hali adminlar bo'lmasa, siz kiritgan birinchi login va parol avtomatik ravishda **Super Admin** sifatida ro'yxatdan o'tadi va bazaga saqlanadi.

## 📄 Litsenziya

Ushbu loyiha tijorat loyihasi bo'lib, barcha huquqlar himoyalangan.

---
**AISCAN Team — 2026**
