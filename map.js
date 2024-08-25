document.addEventListener('DOMContentLoaded', () => {
  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),

      new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
          if (feature.get('selected')) {
            return new ol.style.Style({
              image: new ol.style.Circle({
                radius: 3, // Kırmızı noktanın yarıçapı
                fill: new ol.style.Fill({ color: 'blue' }) // Kırmızı noktanın dolgusu
              })
            });
          }
        }
      }),

      new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
          if (feature.get('highlighted')) {
            return new ol.style.Style({
              // Çember stili
              image: new ol.style.Circle({
                radius: 50, // Çemberin yarıçapı
                fill: new ol.style.Fill({ color: 'rgba(113, 208, 229, 0.3)' }), // Çemberin dolgusu
                stroke: new ol.style.Stroke({
                  color: 'rgba(113, 208, 229, 0.8)', // Çemberin kenarlığı
                  width: 1 // Çemberin kenarlık genişliği
                })
              }),
              // Merkezdeki kırmızı nokta stili
              text: new ol.style.Text({
                text: '\u25CF', // Unicode karakteri: dolu daire
                font: 'bold 10px Arial',
                fill: new ol.style.Fill({ color: 'blue' }),
                offsetX: 0,
                offsetY: 0
              })
            });
          }
        }
      })
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([35.2532, 39.5000]),
      zoom: 6.7
    })
  });

  const panel = document.getElementById('panel');
  const pointX = document.getElementById('pointX');
  const pointY = document.getElementById('pointY');
  const Name = document.getElementById('Name');
  const saveBtn = document.getElementById('save-btn');
  let interaction = null;
  let selectedFeature = null;

  // Kaydetme butonuna tıklama işlevi
  const handleSaveClick = async () => {
    const point = {
      pointX: parseFloat(pointX.textContent),
      pointY: parseFloat(pointY.textContent),
      Name: Name.value
    };

    try {
      const response = await fetch('http://localhost:5183/api/Point/addUOW', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(point)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Point added:', data);

        // Özelliği, sunucudan dönen ID ile güncelle
        if (selectedFeature) {
          selectedFeature.setId(data.id);
        }
      } else {
        console.error('Error adding point:', response.status);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }

    // Paneli gizle ve imleci varsayılan hale getir
    panel.style.display = 'none';
    map.getViewport().style.cursor = 'default';

    // Etkileşimi kaldır
    map.removeInteraction(interaction);
    interaction = null;
  };

  document.getElementById('add-point-btn').addEventListener('click', () => {
    if (!interaction) {
      interaction = new ol.interaction.Select({
        layers: [map.getLayers().getArray()[0]] // Seçim sadece harita katmanı
      });

      map.addInteraction(interaction);
      map.getViewport().style.cursor = 'crosshair';
    }
  });

  map.on('click', (event) => {
    if (interaction) {
      const coord = ol.proj.toLonLat(event.coordinate);
      pointX.textContent = coord[0].toFixed(6);
      pointY.textContent = coord[1].toFixed(6);

      // Haritaya nokta ekle
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(event.coordinate),
        name: Name.value || 'Untitled'
      });

      map.getLayers().getArray()[1].getSource().addFeature(feature);

      // Vurgulama özelliği oluştur
      selectedFeature = new ol.Feature({
        geometry: new ol.geom.Point(event.coordinate)
      });
      selectedFeature.set('highlighted', true);
      map.getLayers().getArray()[2].getSource().clear(); // Var olan vurgulamaları temizle
      map.getLayers().getArray()[2].getSource().addFeature(selectedFeature);

      // Paneli göster
      const circleRadius = 50; // Çemberin yarıçapı
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      const mapSize = map.getSize();
      const mapWidth = mapSize[0];
      const mapHeight = mapSize[1];
      const xOffset = event.pixel[0] + 10;
      const yOffset = event.pixel[1] + 10;

      // Paneli çemberin dışına taşımak için yeni konum hesaplama
      let panelLeft = xOffset;
      let panelTop = yOffset;

      if (xOffset + panelWidth > mapWidth) {
        panelLeft = xOffset - panelWidth - 10; // Paneli sola kaydır
      }
      if (yOffset + panelHeight > mapHeight) {
        panelTop = yOffset - panelHeight - 10; // Paneli yukarı kaydır
      }

      // Paneli görünür yap ve konumunu ayarla
      panel.style.left = `${Math.max(0, panelLeft)}px`;
      panel.style.top = `${Math.max(0, panelTop)}px`;
      panel.style.display = 'block';

      // Kaydetme butonuna tıklama işlevini ekle
      saveBtn.addEventListener('click', handleSaveClick, { once: true });
    }
  });
});
