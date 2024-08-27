document.addEventListener('DOMContentLoaded', async () => {
  const BASE_URL = 'http://localhost:5183';
  let map, vectorSource, interaction, dataTable, currentUpdateId;
  let mapUpdateMode = false;
  
  // DOM Elements
  const elements = {
    panel: document.getElementById('panel'),
    pointX: document.getElementById('pointX'),
    pointY: document.getElementById('pointY'),
    Name: document.getElementById('Name'),
    saveBtn: document.getElementById('save-btn'),
    queryBtn: document.getElementById('query-btn'),
    queryPanel: document.getElementById('query-panel'),
    updatePanel: document.getElementById('update-panel'),
    updatePointX: document.getElementById('update-pointX'),
    updatePointY: document.getElementById('update-pointY'),
    updateName: document.getElementById('update-Name'),
    updateSaveBtn: document.getElementById('update-save-btn'),
    updateCancelBtn: document.getElementById('update-cancel-btn'),
    closeBtn: document.querySelector('.close-btn'),
    addPointBtn: document.getElementById('add-point-btn'),
    confirmationPanel: document.getElementById('confirmation-panel'),
    confirmDelete: document.getElementById('confirm-delete'),
    cancelDelete: document.getElementById('cancel-delete'),
    updateOptions: document.getElementById('update-options'),
    panelUpdate: document.getElementById('panel-update'),
    mapUpdate: document.getElementById('map-update'),
    returnToPanel: document.getElementById('return-to-panel'),
    closeUpdateOptions: document.querySelector('.close-update-options'),
    mapUpdateSaveBtn: document.createElement('button')
  };
  
  elements.mapUpdateSaveBtn.id = 'mapUpdateSaveBtn';
  elements.mapUpdateSaveBtn.textContent = 'Save Location';
  elements.mapUpdateSaveBtn.style.display = 'none';
  document.body.appendChild(elements.mapUpdateSaveBtn);

  let previousZoom;
  let previousCenter;
  let dragInteraction;
  let selectedFeature;
  let saveButton;
  
  // Styles
  const styles = {
    point: new ol.style.Style({
      image: new ol.style.Icon({
        src: 'images/location.png',
        scale: 0.15,
        anchor: [0.5, 1]
      })
    }),
    selected: new ol.style.Style({
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({ color: 'blue' }),
        stroke: new ol.style.Stroke({ color: 'white', width: 2 })
      })
    }),
    highlighted: new ol.style.Style({
      image: new ol.style.Circle({
        radius: 50,
        fill: new ol.style.Fill({ color: 'rgba(113, 208, 229, 0.3)' }),
        stroke: new ol.style.Stroke({
          color: 'rgba(113, 208, 229, 0.8)',
          width: 1
        })
      })
    })
  };

  // Initialize map
  function initializeMap() {
    vectorSource = new ol.source.Vector();
    map = new ol.Map({
      target: 'map',
      layers: [
        new ol.layer.Tile({ source: new ol.source.OSM() }),
        new ol.layer.Vector({
          source: vectorSource,
          style: feature => feature.get('isTemporary') ? styles.selected : styles.point
        }),
        new ol.layer.Vector({
          source: new ol.source.Vector(),
          style: feature => feature.get('highlighted') ? styles.highlighted : null
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([35.2532, 39.5000]),
        zoom: 6.7
      })
    });
  }

  // API calls
  const api = {
    async fetchAllPoints() {
      const response = await fetch(`${BASE_URL}/api/Point`);
      if (!response.ok) throw new Error('Failed to fetch points');
      return response.json();
    },
    async addPoint(point) {
      const response = await fetch(`${BASE_URL}/api/Point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(point)
      });
      if (!response.ok) throw new Error('Failed to add point');
      return response.json();
    },
    async updatePoint(id, point) {
      const response = await fetch(`${BASE_URL}/api/Point/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(point)
      });
      if (!response.ok) throw new Error('Failed to update point');
    },
    async deletePoint(id) {
      const response = await fetch(`${BASE_URL}/api/Point/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete point');
    }
  };

  // Load all points
  async function loadAllPoints() {
    try {
      const data = await api.fetchAllPoints();
      if (data && data.value && Array.isArray(data.value)) {
        vectorSource.clear();
        data.value.forEach(point => {
          const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([point.pointx, point.pointy])),
            id: point.id,
            name: point.name
          });
          vectorSource.addFeature(feature);
        });
      }
    } catch (error) {
      console.error('Error loading points:', error);
      alert('Data not loaded!');
    }
  }

  // Handle save click
  async function handleSaveClick() {
    const point = {
      pointX: parseFloat(elements.pointX.textContent),
      pointY: parseFloat(elements.pointY.textContent),
      Name: elements.Name.value
    };

    try {
      await api.addPoint(point);
      await loadAllPoints();
      resetUI();
    } catch (error) {
      console.error('Error adding point:', error);
    }
  }

  // Reset UI after point addition
  function resetUI() {
    elements.panel.style.display = 'none';
    map.getViewport().style.cursor = 'default';
    map.removeInteraction(interaction);
    interaction = null;
    
    // Clear temporary points and highlight circle
    vectorSource.getFeatures().forEach(feature => {
      if (feature.get('isTemporary')) {
        vectorSource.removeFeature(feature);
      }
    });
    map.getLayers().getArray()[2].getSource().clear();
  }

  // Handle map click
  function handleMapClick(event) {
    if (mapUpdateMode) {
      handleMapUpdateMode(event);
    } else if (interaction) {
      handlePointAddition(event);
    }
  }

  // Handle map update mode
  async function handleMapUpdateMode(event) {
    const coord = ol.proj.toLonLat(event.coordinate);
    const updatedPoint = { pointX: coord[0], pointY: coord[1] };
    try {
      await api.updatePoint(currentUpdateId, updatedPoint);
      mapUpdateMode = false;
      map.getViewport().style.cursor = 'default';
      await loadAllPoints();
      await loadPointsTable();
    } catch (error) {
      console.error('Error updating point:', error);
    }
  }

  // Handle point addition
  function handlePointAddition(event) {
    const coord = ol.proj.toLonLat(event.coordinate);
    elements.pointX.textContent = coord[0].toFixed(6);
    elements.pointY.textContent = coord[1].toFixed(6);

    // Create temporary point feature
    const tempFeature = new ol.Feature({
      geometry: new ol.geom.Point(event.coordinate),
      isTemporary: true
    });

    // Clear previous temporary points
    vectorSource.getFeatures().forEach(feature => {
      if (feature.get('isTemporary')) {
        vectorSource.removeFeature(feature);
      }
    });

    // Add new temporary point
    vectorSource.addFeature(tempFeature);

    // Add highlight circle
    const highlightFeature = new ol.Feature({
      geometry: new ol.geom.Point(event.coordinate)
    });
    highlightFeature.set('highlighted', true);
    map.getLayers().getArray()[2].getSource().clear();
    map.getLayers().getArray()[2].getSource().addFeature(highlightFeature);

    positionPanel(event);
    elements.saveBtn.addEventListener('click', handleSaveClick, { once: true });
  }

  // Position panel
  function positionPanel(event) {
    const panelWidth = elements.panel.offsetWidth;
    const panelHeight = elements.panel.offsetHeight;
    const mapSize = map.getSize();
    const [mapWidth, mapHeight] = mapSize;
    const [xOffset, yOffset] = [event.pixel[0] + 10, event.pixel[1] + 10];

    let [panelLeft, panelTop] = [xOffset, yOffset];

    if (xOffset + panelWidth > mapWidth) panelLeft = xOffset - panelWidth - 10;
    if (yOffset + panelHeight > mapHeight) panelTop = yOffset - panelHeight - 10;

    elements.panel.style.left = `${Math.max(0, panelLeft)}px`;
    elements.panel.style.top = `${Math.max(0, panelTop)}px`;
    elements.panel.style.display = 'block';
  }

  // Load points table
  async function loadPointsTable() {
    try {
      const data = await api.fetchAllPoints();

      if (dataTable) {
        dataTable.destroy();
      }

      dataTable = $('#points-table').DataTable({
        data: data.value,
        columns: [
          { data: 'pointx', width: '25%' },
          { data: 'pointy', width: '25%' },
          { data: 'name', width: '25%' },
          {
            data: null,
            width: '25%',
            render: (data, type, row) => `
              <button class="action-btn update-btn" data-id="${row.id}">Update</button>
              <button class="action-btn show-btn" data-id="${row.id}">Show</button>
              <button class="action-btn delete-btn" data-id="${row.id}">Delete</button>
            `
          }
        ],
        scrollX: true,
        scrollY: '400px',
        scrollCollapse: true,
        paging: true,
        columnDefs: [
          { targets: '_all', className: 'dt-head-left' }
        ],
        initComplete: function(settings, json) {
          this.api().columns().every(function(colIdx) {
            var column = this;
            var cell = $('.filters th').eq($(column.header()).index());
            var title = $(column.header()).text();
            cell.html('<input type="text" placeholder="' + title + '" />');
            $('input', cell).on('keyup change', function() {
              if (column.search() !== this.value) {
                column.search(this.value).draw();
              }
            });
          });
          makeResizable(this.api());
        }
      });

      addTableEventListeners();
    } catch (error) {
      console.error('Error loading points:', error);
    }
  }

  // Add table event listeners
  function addTableEventListeners() {
    $('#points-table').on('click', '.update-btn', function() {
      currentUpdateId = $(this).data('id');
      elements.updateOptions.style.display = 'block';
    });

    $('#points-table').on('click', '.show-btn', function() {
      showPoint($(this).data('id'));
    });

    $('#points-table').on('click', '.delete-btn', function() {
      showDeleteConfirmation($(this).data('id'));
    });

    // Yeni kapatma butonu için event listener ekleyelim
    elements.closeUpdateOptions.addEventListener('click', () => {
      elements.updateOptions.style.display = 'none';
    });

    // Modal dışına tıklandığında da kapanmasını sağlayalım
    window.addEventListener('click', (event) => {
      if (event.target == elements.updateOptions) {
        elements.updateOptions.style.display = 'none';
      }
    });
  }

  // Update point
  async function updatePoint(id, method) {
    try {
      const data = await api.fetchAllPoints();
      const point = data.value.find(p => p.id === id);
      if (point) {
        if (method === 'panel') {
          elements.updatePointX.value = point.pointx;
          elements.updatePointY.value = point.pointy;
          elements.updateName.value = point.name;
          elements.updatePanel.style.display = 'block';
        } else if (method === 'map') {
          elements.updateOptions.style.display = 'none';
          elements.queryPanel.style.display = 'none';

          // Seçilen noktayı bul ve vurgula
          selectedFeature = vectorSource.getFeatures().find(f => f.get('id') === id);
          if (selectedFeature) {
            selectedFeature.setStyle(styles.selected);
            
            // Haritayı seçilen noktaya odakla
            map.getView().animate({
              center: selectedFeature.getGeometry().getCoordinates(),
              zoom: 7,
              duration: 1000
            });

            // Sürükleme etkileşimini ekle
            dragInteraction = new ol.interaction.Translate({
              features: new ol.Collection([selectedFeature])
            });
            map.addInteraction(dragInteraction);

            // Sürükleme bittiğinde saveButton'u göster
            dragInteraction.on('translateend', () => {
              elements.mapUpdateSaveBtn.style.display = 'block';
            });

            // Save butonuna tıklandığında
            elements.mapUpdateSaveBtn.onclick = async () => {
              const newCoord = ol.proj.toLonLat(selectedFeature.getGeometry().getCoordinates());
              const updatedPoint = {
                pointX: newCoord[0],
                pointY: newCoord[1],
                Name: point.name
              };

              try {
                await api.updatePoint(id, updatedPoint);
                resetMapUpdateUI();
                await loadAllPoints();
                // Veri panelini gösterme ve tabloyu güncelleme işlemini kaldırdık
              } catch (error) {
                console.error('Error updating point:', error);
              }
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching point data:', error);
    }
  }
  
  
  // Map update UI'ı sıfırla
  function resetMapUpdateUI() {
    if (dragInteraction) {
      map.removeInteraction(dragInteraction);
    }
    if (selectedFeature) {
      selectedFeature.setStyle(null);
    }
    elements.mapUpdateSaveBtn.style.display = 'none';
    // Veri panelini gösterme işlemini kaldırdık
  }

  // Show point
  function showPoint(id) {
    const feature = vectorSource.getFeatures().find(f => f.get('id') === id);
    if (feature) {
      // Mevcut zoom ve merkez bilgilerini kaydedelim
      previousZoom = map.getView().getZoom();
      previousCenter = map.getView().getCenter();

      // Query panelini gizleyelim
      elements.queryPanel.style.display = 'none';

      // Return to Panel butonunu gösterelim
      elements.returnToPanel.style.display = 'block';

      map.getView().animate({
        center: feature.getGeometry().getCoordinates(),
        zoom: 10,
        duration: 1000
      });
    }
  }
  
  elements.returnToPanel.addEventListener('click', () => {
    // Önceki zoom ve merkez konumuna dönelim
    map.getView().animate({
      center: previousCenter,
      zoom: previousZoom,
      duration: 1000
    });

    // Query panelini tekrar gösterelim
    elements.queryPanel.style.display = 'block';

    // Return to Panel butonunu gizleyelim
    elements.returnToPanel.style.display = 'none';
  });

  // Show delete confirmation
  function showDeleteConfirmation(id) {
    elements.confirmationPanel.style.display = 'block';
    elements.confirmDelete.onclick = () => deletePoint(id);
    elements.cancelDelete.onclick = () => elements.confirmationPanel.style.display = 'none';
  }

  // Delete point
  async function deletePoint(id) {
    try {
      await api.deletePoint(id);
      await loadPointsTable();
      await loadAllPoints();
      elements.confirmationPanel.style.display = 'none';
      alert("Point deleted successfully.");
    } catch (error) {
      console.error('Error deleting point:', error);
      alert("An error occurred while deleting the point. Please try again.");
    }
  }

  // Make table resizable
  function makeResizable(api) {
    const tableContainer = api.table().container();
    $(tableContainer).find('thead th').each(function(i) {
      const th = $(this);
      const resizer = $('<div class="table-resizer"></div>');
      th.append(resizer);
      
      resizer.on('mousedown', function(e) {
        const startX = e.pageX;
        const startWidth = th.width();
        
        $(document).on('mousemove.resize', function(e) {
          const width = startWidth + (e.pageX - startX);
          th.width(width);
          api.columns.adjust();
        });
        
        $(document).on('mouseup.resize', function() {
          $(document).off('mousemove.resize mouseup.resize');
        });
      });
    });
  }

  // Event listeners
  elements.addPointBtn.addEventListener('click', () => {
    if (!interaction) {
      interaction = new ol.interaction.Select({
        layers: [map.getLayers().getArray()[0]]
      });
      map.addInteraction(interaction);
      map.getViewport().style.cursor = 'crosshair';
    }
  });

  elements.queryBtn.addEventListener('click', async () => {
    elements.queryPanel.style.display = 'block';
    await loadPointsTable();
  });

  elements.updateSaveBtn.addEventListener('click', async () => {
    const updatedPoint = {
      pointX: parseFloat(elements.updatePointX.value),
      pointY: parseFloat(elements.updatePointY.value),
      Name: elements.updateName.value
    };

    try {
      await api.updatePoint(currentUpdateId, updatedPoint);
      elements.updatePanel.style.display = 'none';
      await loadAllPoints();
      await loadPointsTable();
    } catch (error) {
      console.error('Error updating point:', error);
    }
  });

  elements.updateCancelBtn.addEventListener('click', () => {
    elements.updatePanel.style.display = 'none';
  });
      elements.closeBtn.addEventListener('click', () => {
        elements.queryPanel.style.display = 'none';
        if (dataTable) {
          dataTable.destroy();
          dataTable = null;
        }
      });
  
      elements.panelUpdate.addEventListener('click', () => {
        updatePoint(currentUpdateId, 'panel');
        elements.updateOptions.style.display = 'none';
      });
  
      elements.mapUpdate.addEventListener('click', () => {
        updatePoint(currentUpdateId, 'map');
        elements.updateOptions.style.display = 'none';
      });
  
      // Close panel button event listener
      document.querySelector('.close-panel-btn').addEventListener('click', () => {
        elements.panel.style.display = 'none';
        resetUI();
      });
  
      // Initialize
      initializeMap();
      map.on('click', handleMapClick);
      await loadAllPoints();
      addTableEventListeners();
    });