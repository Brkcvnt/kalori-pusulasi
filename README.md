# Kalori Pusulası 🌿

Türkçe, mobil uyumlu bir günlük kalori takip uygulaması. Sunucu hesabı, API anahtarı veya ücretli servis gerektirmez.

## Özellikler

- Yaş, boy, kilo, formülde kullanılan cinsiyet ve hareket düzeyinden yaklaşık günlük enerji ihtiyacı
- İsteğe bağlı özel kalori hedefi
- Gram / mililitre üzerinden öğün ve besin kaydı; 7.793 USDA temel besini ve 3.345 Türkiye ürününden arama, otomatik kalori, marka/barkod ile çevrimiçi arama
- Alınan kalori, hedefe kalan veya hedef üstü fark
- Tarihe göre günlükler, 7 ve 30 günlük geçmiş ve kayıtlı günlerin kalori ortalaması
- Besin miktarını ve öğününü düzenleme, kayıtlı öğünleri tekrar kullanma ve tarifleri porsiyonla günlüğe ekleme
- Kaynağında bulunan protein, karbonhidrat ve yağ değerlerinden günlük makro toplamı
- Kamerayla paket barkodu tarama ve elle barkod arama
- Kayıt silme, JSON yedek indirme ve doğrulanmış yedek geri yükleme
- HTTPS üzerinde ana ekrana kurulabilen PWA ve ilk ziyaretten sonra çevrimdışı kullanım
- Analitik, reklam veya izleme yok

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

Veriler varsayılan olarak cihazın `localStorage` alanında tutulur. Cihazlar arası eşitleme için bir Supabase hesabı bağlanabilir. JSON yedekleriyle kayıtları cihazlar arasında elle de taşıyabilirsin. Geri yükleme mevcut kayıtları değiştirir. Yedek profil ve besin bilgilerini içerir; güvenli sakla. Tarayıcı verilerini silmek, gizli mod veya depolama sınırı kayıtların kaybolmasına yol açabilir. Düzenli yedek al. Uygulama verileri GitHub’a yüklenmez; yalnızca kaynak kodu yayınlanır.

## Öğünler ve tarifler

Günlükte tekrar kullanacağın besinleri işaretle, **Öğünler ve tarifler** bölümünde ad verip kaydet. Tarif için arama sonucunu seç, miktar gir ve **Tarife malzeme ekle** düğmesini kullan. Tarifin toplam porsiyonunu belirle. Daha sonra tariften yediğin porsiyon sayısını seçip günlüğe ekleyebilirsin.

**Barkod tara** düğmesi kameraya izin istediğinde açılır. Tarayıcıda kamera için HTTPS veya localhost gerekir. Kamera görüntüsü cihazda işlenir ve tarama penceresi kapanınca kamera durur. Barkodu arama kutusuna elle de girebilirsin.


## Cihazlar arası eşitleme

Eşitleme isteğe bağlıdır. Supabase bağlantısı kurulana kadar günlükler ve profil bu cihazda tutulur. Bağlantı kurulduğunda profil, günlük, favoriler, öğünler ve tarifler oturum açılan hesaba gönderilir. Tema ve bildirim ayarları cihazda kalır.

1. Bir Supabase projesinde [Email Auth](https://supabase.com/docs/guides/auth/passwords) özelliğini etkinleştir. Hesap doğrulaması açıksa e-posta gönderimi ve Site URL ayarlarını yapılandır.
2. Projenin SQL Editor ekranında [supabase-sync.sql](supabase-sync.sql) dosyasını çalıştır. Satır erişimi kullanıcının hesabıyla sınırlanır ve iki cihazın aynı sürümün üzerine yazması engellenir.
3. **Eşitleme ve hatırlatıcı → Cihazlar arasında eşitle** bölümüne proje URL’sini ve `sb_publishable_` ile başlayan açık anahtarı gir. Hesap oluştur veya giriş yap. İki cihazda da aynı proje ve hesap bilgilerini kullan.
4. İlk yüklemeyi onayla. İki cihaz farklı kayıtlar içerdiğinde uygulama hangi kopyayı kullanacağını sorar. İki kopyayı da tutmak için seçimden önce ilgili cihazlardan JSON yedeği al.

Supabase'in proje URL’si ve açık anahtarı istemcide kullanılır. Secret key veya service role key yalnızca sunucu içindir. Oturum bilgileri bu cihazda saklanır. [Supabase API anahtarları](https://supabase.com/docs/guides/api/api-keys)

## Android güncelleme bildirimleri

**Profil → Ayarlar → Güncelleme bildirimleri** bölümünden açılır. Bu ayar açıkken Android sürüm bildirimlerine Firebase Cloud Messaging üzerinden abone olunur. GitHub’da yeni Android sürümü yayımlandığında yayın iş akışı bildirim gönderir. Android arka planda sürümü düzenli olarak da denetler. Bildirime dokununca güncelleme ekranı açılır ve indirme kullanıcı onayıyla başlar.

## Gezinme ve öğün planlama

Ana bölümler masaüstünde üstte, telefonda alttaki sabit menüde görünür. Açık, Koyu ve Cihaz seçenekleri uygulamanın renklerini ve logosunu birlikte değiştirir.

**Plan** bölümünden kayıtlı bir tarifi ya da öğünü seçip bir tarihe ekleyebilirsin. Plan, porsiyon kalorisini ve o günün alışveriş listesini gösterir. Planlanan gün geldiğinde öğünü günlüğe aktar. Türk yemeği şablonlarında malzemeleri ve miktarları kaydetmeden önce düzenleyebilirsin.

## Günlük araçları

- Arama alanı boşken favoriler ve son kullanılan besinler listelenir. **Önceki günün seçili öğününü kopyala** düğmesi öğün seçicisindeki öğünü seçili tarihe ekler.
- Ölçü menüsü, kaynakta tek bir ağırlıkla belirtilen dilim, adet, porsiyon veya paketleri gösterir. Miktar cihazda gram veya mililitreye çevrilir.
- **Kalori geçmişi** seçili günde biten 7 gün ile ondan önceki 7 günü karşılaştırır. Grafikte bir güne dokunarak günlük kaydını açabilirsin. **Excel için CSV indir** tarih aralığını ve bulunan besin değerlerini dışa aktarır.
- Hatırlatıcı Android'de cihaz bildirim izniyle ve uygulama kapalıyken çalışabilir. Android pil ayarları zamanı geciktirebilir. Web hatırlatıcısı uygulama sayfası açık ve görünürken çalışır.

## Hesaplama

Mifflin–St Jeor: `10 × kg + 6.25 × cm − 5 × yaş + sabit` (erkek +5, kadın −161). Aktivite katsayıları: 1.2, 1.375, 1.55, 1.725. Sonuç kiloyu korumaya yönelik tahmindir; kilo kaybı hedefi otomatik önerilmez. Özel hedef en az 1000 ve en fazla 6000 kcal olarak girilebilir; bu aralık kişisel uygunluk anlamına gelmez.

Kaynak: [Mifflin et al., AJCN 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/). [Orijinal makale PDF](https://www.carnotdiet.com/Files/BMRMifflin1990.pdf).

18 yaş altı, hamilelik ve emzirme için uygun değildir. Tıbbi tavsiye değildir. Besin önerileri yaklaşık genel değerlerdir; marka, hazırlama ve pişirme yöntemine göre farklılaşır. Ambalajı kontrol et; pişmiş ve çiğ ağırlığı karıştırma. Besinler USDA ve Open Food Facts kaynaklarından gelir; tüm ürünleri kapsamaz. Open Food Facts topluluk verileri eksik veya hatalı olabilir.

## Teknoloji

HTML, CSS, ES Modules, Service Worker, Web App Manifest; Node.js yerleşik test araçları. Kamera taraması, projeye dahil edilen [ZXing Browser 0.1.5](https://github.com/zxing-js/browser/releases/tag/v0.1.5) ile cihazda çalışır. Lisanslar [ZXING-BROWSER-LICENSE.txt](ZXING-BROWSER-LICENSE.txt) dosyasındadır.

## Besin verileri

- `usda-foods.json`: [USDA SR Legacy Nisan 2018](https://fdc.nal.usda.gov/download-datasets/) enerji (1008), protein (1003), yağ (1004), karbonhidrat (1005), lif (1079) ve şeker (2000) değerleri, 100 g üzerinden. 7.793 kayıt. Asıl açıklama, FDC kimliği ve Türkçe arama karşılıkları korunur. USDA verileri kamu malıdır. Çeviriler yaklaşık arama yardımıdır.
- `packaged-foods.json`: Open Food Facts Search-a-licious üzerinden `countries_tags:"en:turkey"` sorgusuyla 29 Ekim 2026 tarihinde indirilen 3.345 ürün; [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Kaynak [Open Food Facts](https://world.openfoodfacts.org/). Bu dosya ODbL kapsamındadır; uygulama kodunun lisansı ayrıdır. Eksik kalori kaydı seçilemez.
- Canlı arama: Search-a-licious GET `/search`; barkod: OFF `/api/v2/product/{code}`. Arama açık düğmeyle yapılır; istemci en az 7 saniye aralık bırakır. Hizmetin erişimi/CORS/kotaları değişebilir; kaynak katalog internet olmadan da kullanılabilir.
- Kişisel profil ve günlük servise gönderilmez. Yalnızca arama metni veya barkod ve normal bağlantı bilgileri (IP gibi) sağlayıcıya gider. Son seçilen en fazla 100 ürün cihazda önbelleğe alınır.
- Kalori ve mevcut makrolar kayıt anındaki değerleriyle saklanır. Makrosu bulunmayan eski kayıtlarda günlük özet bilgi kapsamını gösterir.
