# Kalori Pusulası 🌿

Türkçe, mobil uyumlu bir günlük kalori takip uygulaması. Sunucu hesabı, API anahtarı veya ücretli servis gerektirmez.

## Özellikler

- Yaş, boy, kilo, formülde kullanılan cinsiyet ve hareket düzeyinden yaklaşık günlük enerji ihtiyacı
- İsteğe bağlı özel kalori hedefi
- Gram / mililitre üzerinden öğün ve besin kaydı; 7.793 USDA temel besini ve 3.345 Türkiye ürününden arama, otomatik kalori, marka/barkod ile çevrimiçi arama
- Alınan kalori, hedefe kalan veya hedef üstü fark
- Tarihe göre günlükler ve son 7 gün özeti; kaydedilmiş günlerin hedeflerini koruma
- Kayıt silme, JSON yedek indirme ve doğrulanmış yedek geri yükleme
- HTTPS üzerinde ana ekrana kurulabilen PWA ve ilk ziyaretten sonra çevrimdışı kullanım
- Harici bağımlılık, analitik, reklam veya izleme yok

## Çalıştırma

Node.js 22 veya üstü ile:

```sh
npm start
```

Tarayıcıda http://localhost:4173 adresini aç. Testler: `npm test`.

## GitHub Pages ile yayınlama

Depoda **Settings → Pages → Deploy from a branch → main → / (root)** seç. Yayın URL’si `https://Brkcvnt.github.io/kalori-pusulasi/` olur. Bu ayar etkinleştirilmeden adres çalışmaz. Statik dosyalar başka bir HTTPS sunucusunda da yayınlanabilir. Derleme gerekmez.

Android Chrome’da menüden **Uygulamayı yükle / Ana ekrana ekle**, iPhone Safari’de **Paylaş → Ana Ekrana Ekle** seç. Bilgisayarda destekleyen tarayıcının adres çubuğundaki yükleme düğmesi kullanılabilir. Kurulum, HTTPS veya localhost gerektirir. Doğrudan dosya olarak açmak yerine sunucu kullan.

## Veriler ve gizlilik

Veriler yalnızca kullanılan tarayıcının `localStorage` alanında tutulur. Telefonda ve bilgisayarda uygulama çalışır; **otomatik cihaz eşitleme yoktur**. Taşımak için yedeği indirip diğer cihazda geri yükle. Geri yükleme mevcut kayıtları değiştirir. Yedek profil ve besin bilgilerini içerir; güvenli sakla. Tarayıcı verilerini silmek, gizli mod veya depolama sınırı kayıtların kaybolmasına yol açabilir. Düzenli yedek al. Uygulama verileri GitHub’a yüklenmez; yalnızca kaynak kodu yayınlanır.

## Hesaplama

Mifflin–St Jeor: `10 × kg + 6.25 × cm − 5 × yaş + sabit` (erkek +5, kadın −161). Aktivite katsayıları: 1.2, 1.375, 1.55, 1.725. Sonuç kiloyu korumaya yönelik tahmindir; kilo kaybı hedefi otomatik önerilmez. Özel hedef en az 1000 ve en fazla 6000 kcal olarak girilebilir; bu aralık kişisel uygunluk anlamına gelmez.

Kaynak: [Mifflin et al., AJCN 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/). [Orijinal makale PDF](https://www.carnotdiet.com/Files/BMRMifflin1990.pdf).

18 yaş altı, hamilelik ve emzirme için uygun değildir. Tıbbi tavsiye değildir. Besin önerileri yaklaşık genel değerlerdir; marka, hazırlama ve pişirme yöntemine göre farklılaşır. Ambalajı kontrol et; pişmiş ve çiğ ağırlığı karıştırma. Besinler USDA ve Open Food Facts kaynaklarından gelir; tüm ürünleri kapsamaz. Open Food Facts topluluk verileri eksik veya hatalı olabilir.

## Teknoloji

HTML, CSS, ES Modules, Service Worker, Web App Manifest; Node.js yerleşik test araçları. Bağımlılıksız statik mimari.

## Besin verileri (1.3.0)

- `usda-foods.json`: [USDA SR Legacy Nisan 2018](https://fdc.nal.usda.gov/download-datasets/) enerji (nutrient 1008), kcal/100 g. 7.793 kayıt. Asıl açıklama, FDC kimliği ve Türkçe arama karşılıkları korunur. USDA verileri kamu malıdır. Çeviriler yaklaşık arama yardımıdır.
- `packaged-foods.json`: Open Food Facts Search-a-licious üzerinden `countries_tags:"en:turkey"` sorgusuyla 29 Ekim 2026 tarihinde indirilen 3.345 ürün; [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Kaynak [Open Food Facts](https://world.openfoodfacts.org/). Bu dosya ODbL kapsamındadır; uygulama kodunun lisansı ayrıdır. Eksik kalori kaydı seçilemez.
- Canlı arama: Search-a-licious GET `/search`; barkod: OFF `/api/v2/product/{code}`. Arama açık düğmeyle yapılır; istemci en az 7 saniye aralık bırakır. Hizmetin erişimi/CORS/kotaları değişebilir; kaynak katalog internet olmadan da kullanılabilir.
- Kişisel profil ve günlük servise gönderilmez. Yalnızca arama metni veya barkod ve normal bağlantı bilgileri (IP gibi) sağlayıcıya gider. Son seçilen en fazla 100 ürün cihazda önbelleğe alınır.
- Eski günlükler değişmez. Kalori, ekleme anındaki değer olarak saklanır; ürün etiketi sonradan değişse bile geçmiş hesaplar değişmez.
