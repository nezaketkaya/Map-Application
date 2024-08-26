document.addEventListener('DOMContentLoaded', async () => {
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
                radius: 3,
                fill: new ol.style.Fill({ color: 'blue' })
              })
            });
          }
        }
      }),
      new ol.layer.Vector({
        source: new ol.source.Vector()
      }),
      new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
          if (feature.get('highlighted')) {
            return new ol.style.Style({
              image: new ol.style.Circle({
                radius: 50,
                fill: new ol.style.Fill({ color: 'rgba(113, 208, 229, 0.3)' }),
                stroke: new ol.style.Stroke({
                  color: 'rgba(113, 208, 229, 0.8)',
                  width: 1
                })
              }),
              text: new ol.style.Text({
                text: '\u25CF',
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

  const pointStyle = new ol.style.Style({
    image: new ol.style.Icon({
      src: 'images/location.png',
      scale: 0.15,
      anchor: [0.5, 1]
    })
  });

  const vectorSource = new ol.source.Vector();

  const panel = document.getElementById('panel');
  const pointX = document.getElementById('pointX');
  const pointY = document.getElementById('pointY');
  const Name = document.getElementById('Name');
  const saveBtn = document.getElementById('save-btn');
  let interaction = null;
  let selectedFeature = null;

  // Yeni fonksiyon: Tüm noktaları yükle
  const loadAllPoints = async () => {
    try {
      const response = await fetch('http://localhost:5183/api/Point/getAllUOW', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.value && Array.isArray(data.value)) {
          vectorSource.clear();
          data.value.forEach(point => {
            const feature = new ol.Feature({
              geometry: new ol.geom.Point(ol.proj.fromLonLat([point.pointx, point.pointy])),
              id: point.id,
              name: point.name
            });
            feature.setStyle(pointStyle);
            vectorSource.addFeature(feature);
          });

          map.getLayers().getArray()[2].setSource(vectorSource);
        } else {
          console.error('Unexpected response format. Expected data.value to be an array.');
        }
      } else {
        console.error('Error getting points:', response.status);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Veri alınamadı! Lütfen tekrar deneyin.');
    }
  };

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

        // Tüm noktaları yeniden yükle
        await loadAllPoints();
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
    
    // Vurgulanan özelliği (mavi çember ve nokta) temizle
    map.getLayers().getArray()[3].getSource().clear();
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
      map.getLayers().getArray()[3].getSource().clear(); // Var olan vurgulamaları temizle
      map.getLayers().getArray()[3].getSource().addFeature(selectedFeature);

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

  // Sayfa yüklendiğinde tüm noktaları yükle
  await loadAllPoints();
});