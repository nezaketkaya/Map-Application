document.addEventListener('DOMContentLoaded', () => {
  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
          image: new ol.style.Circle({
            radius: 3,
            fill: new ol.style.Fill({ color: 'red' })
          })
        })
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

  // Function to handle save button click
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

        // Update the feature with the ID returned from the server
        feature.setId(data.id);
      } else {
        console.error('Error adding point:', response.status);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }

    // Hide the panel and reset cursor
    panel.style.display = 'none';
    map.getViewport().style.cursor = 'default';
    
    // Remove the interaction after saving
    map.removeInteraction(interaction);
    interaction = null;

    // Remove the event listener after saving
    saveBtn.removeEventListener('click', handleSaveClick);
  };

  document.getElementById('add-point-btn').addEventListener('click', () => {
    if (!interaction) {
      interaction = new ol.interaction.Select({
        layers: [map.getLayers().getArray()[1]]
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

      // Add the point to the map immediately
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(event.coordinate),
        name: Name.value || 'Untitled'
      });

      map.getLayers().getArray()[1].getSource().addFeature(feature);

      // Show the panel
      panel.style.display = 'block';
      panel.style.left = `${event.pixel[0] + 10}px`;
      panel.style.top = `${event.pixel[1] + 10}px`;

      // Event listener for closing the panel
      document.getElementById('close-panel-btn').addEventListener('click', () => {
        panel.style.display = 'none';
        map.getViewport().style.cursor = 'default';
      }, { once: true });

      // Add the event listener for saving the point
      saveBtn.addEventListener('click', handleSaveClick, { once: true });
    }
  });
});
