# Mikro Simülasyon — GitHub Pages sürümü

Bu klasör, **terminal veya Node.js gerektirmeyen** hazır web sitesi sürümüdür. React/Vite derlemesi yoktur; HTML, CSS ve JavaScript doğrudan tarayıcıda çalışır. GitHub Pages ile yayınlanabilir.

## GitHub üzerinden yayınlama (terminal kullanmadan)

1. Bu ZIP dosyasını bilgisayarında bir klasöre çıkart. ZIP dosyasını GitHub'a ZIP olarak yükleme; içindeki dosyaları yükle.
2. GitHub'da yeni bir repository (depo) oluştur. Depo adı örneğin `mikro-simulasyon` olabilir.....
3. Deponun ana sayfasında **Add file → Upload files** seçeneğine gir.
4. ZIP'ten çıkardığın klasörün **içindeki** `index.html`, `app.js`, `style.css` ve `README.md` dosyalarını sürükleyip bırak. `index.html` depo ana dizininde görünmeli; dosyaları bir alt klasörün içine koyma.
5. **Commit changes** ile dosyaları kaydet.
6. Depoda **Settings → Pages** sayfasını aç.
7. **Build and deployment** bölümünde **Deploy from a branch** seç. Branch olarak `main`, klasör olarak `/(root)` seçip **Save**'e bas.
8. Birkaç dakika sonra aynı Pages ekranında görünen `https://KULLANICI_ADIN.github.io/DEPO_ADI/` adresini aç.

> `KULLANICI_ADIN` ve `DEPO_ADI` kendi GitHub kullanıcı adın ve depo adındır. Depo adı `mikro-simulasyon` ise adresin sonu `/mikro-simulasyon/` olur.

## Özellikler

- Newton çekim modeline dayalı 2D çok cisim simülasyonu
- Başlat / duraklat, tek adım ilerlet ve sıfırla
- Hazır deneyler, çekim katsayısı, zaman adımı ve hız kontrolleri
- Cisim ekleme ve silme
- Sahneyi sürükleyerek taşıma ve fare tekerleğiyle yakınlaştırma
- Izgara ve hareket izlerini açıp kapatma
- Enerji, momentum, hız ve konum göstergeleri
- Deneyleri tarayıcıda kaydetme, kayıtları geri yükleme
- JSON içe/dışa aktarma
- Açık/koyu tema ve mobil uyumlu görünüm

Kayıtlar `localStorage` içinde, yalnızca kullanılan tarayıcıda saklanır. Bu sürüm backend veya kullanıcı hesabı içermez.
