# AISCAN - AI Procurement Auditing Platform

AISCAN — bu davlat va korporativ xaridlar hujjatlarini (Texnik topshiriqlar, shartnomalar, tijorat takliflari) sun'iy intellekt (Gemini 3.1 Pro) yordamida chuqur tahlil qilish va audit qilish uchun mo'ljallangan professional platforma.

## 🚀 Asosiy Imkoniyatlar

- **Meticulous Per-Clause Audit**: Har bir bandni alohida va sinchkovlik bilan tekshirish.
- **Ko'p tillilik (Multilingual)**: O'zbek, Rus va Ingliz tillarida to'liq tahlil va kesh tizimi.
- **Affiliatsiya Tahlili**: Turli kompaniyalar o'rtasidagi yashirin bog'liqliklarni (ta'sischilar, STIR) aniqlash.
- **Market Tahlili**: Texnik talablar asosida bozordan mos kompaniyalar va o'rtacha narxlarni topish.
- **Admin Panel**: Foydalanuvchilarni boshqarish, ichki nizomlarni yuklash va barcha tahlillarni kuzatish.
- **Xavfsizlik**: Hujjatlar va tahlillar MongoDB bazasida xavfsiz saqlanadi.

## 🛠 Texnologiyalar

- **Frontend/Backend**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Sun'iy Intellekt**: [Google Gemini 3.1 Pro API](https://ai.google.dev/)
- **Ma'lumotlar bazasi**: [MongoDB](https://www.mongodb.com/)
- **Stilizatsiya**: Glassmorphism UI (Vanilla CSS)
- **Autentifikatsiya**: Iron Session

## 📦 O'rnatish va Ishga tushirishEL

1. **Repozitoriyani yuklab oling:**
   ```bash
   git clone <repo-url>
   cd aiscan2
   ```

2. **Kutubxonalarni o'rnating:**
   ```bash
   npm install
   ```

3. **Muhit o'zgaruvchilarini sozlang:**
   Loyihaning ildiz papkasida `.env.local` faylini yarating va quyidagi ma'lumotlarni kiriting:
   ```env
   MONGODB_URI=mongodb://localhost:27017/aiscan3_db
   GEMINI_API_KEY=Sizning_API_Kalitingiz
   GEMINI_MODEL=gemini-3.1-pro-preview
   SESSION_SECRET=kamida_32_belgili_maxfiy_satr
   ```

4. **Loyiha ishga tushiring:**
   ```bash
   npm run dev
   ```
   Loyiha [http://localhost:3000](http://localhost:3000) manzilida ochiladi.

## 📁 Loyiha Strukturasi

- `/app`: Sahifalar va API yo'llari (Next.js App Router).
- `/components`: Qayta ishlatiladigan UI komponentlar.
- `/lib`: Ma'lumotlar bazasi modellari, ulanishlar va tarjimalar.
- `/public`: Rasmlar, fontlar va global CSS uslublari.

## 🔐 Admin Panel

Admin panelga kirish uchun `/admin/login` sahifasiga o'ting.
*Eslatma: Birinchi foydalanuvchini ma'lumotlar bazasi (`users` collection) orqali qo'shishingiz mumkin.*

## 📄 Litsenziya

Ushbu loyiha tijorat loyihasi bo'lib, barcha huquqlar himoyalangan.

---
**AISCAN Team — 2026**
