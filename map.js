document.addEventListener('DOMContentLoaded', async () => {
  const BASE_URL = 'http://localhost:5183';
  let map, vectorSource, interaction, dataTable, lineStringDataTable, polygonDataTable, currentUpdateId;
  let mapUpdateMode = false;
  let drawInteraction;
  let lineStringFeature;
  let polygonFeature;

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
    mapUpdateSaveBtn: document.createElement('button'),
    notification: document.getElementById('notification'),
    addLineStringBtn: document.getElementById('add-linestring-btn'),
    queryLineStringBtn: document.getElementById('query-linestring-btn'),
    finishDrawingBtn: document.getElementById('finish-drawing'),
    lineStringPanel: document.getElementById('linestring-panel'),
    lineStringQueryPanel: document.getElementById('linestring-query-panel'),
    lineStringName: document.getElementById('linestring-name'),
    saveLineStringBtn: document.getElementById('save-linestring-btn'),
    addPolygonBtn: document.getElementById('add-polygon-btn'),
    queryPolygonBtn: document.getElementById('query-polygon-btn'),
    finishPolygonDrawingBtn: document.getElementById('finish-polygon-drawing'),
    polygonPanel: document.getElementById('polygon-panel'),
    polygonQueryPanel: document.getElementById('polygon-query-panel'),
    polygonName: document.getElementById('polygon-name'),
    savePolygonBtn: document.getElementById('save-polygon-btn'),
    closeLineStringBtn: document.querySelector('#linestring-query-panel .close-btn'),
  closePolygonBtn: document.querySelector('#polygon-query-panel .close-btn'),
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
    }),
    lineString: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'blue',
        width: 3
      })
    }),
    polygon: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 2
      })
    })
  };

  // Initialize map
  function initializeMap() {
    console.log('Initializing map...');
    vectorSource = new ol.source.Vector();
    const lineStringVectorSource = new ol.source.Vector();
    const polygonVectorSource = new ol.source.Vector();
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
        }),
        new ol.layer.Vector({
          source: lineStringVectorSource,
          style: styles.lineString
        }),
        new ol.layer.Vector({
          source: polygonVectorSource,
          style: styles.polygon
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([35.2532, 39.5000]),
        zoom: 6.7
      })
    });
    console.log('Map initialized');
  }

  // API calls
  const api = {
    async fetchAllPoints() {
      console.log('Fetching all points...');
      const response = await fetch(`${BASE_URL}/api/Point`);
      if (!response.ok) throw new Error('Failed to fetch points');
      const data = await response.json();
      console.log('Fetched points:', data);
      return data;
    },
    async addPoint(point) {
      console.log('Adding point:', point);
      const response = await fetch(`${BASE_URL}/api/Point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(point)
      });
      if (!response.ok) throw new Error('Failed to add point');
      const data = await response.json();
      console.log('Added point:', data);
      return data;
    },
    async updatePoint(id, point) {
      console.log('Updating point:', id, point);
      const response = await fetch(`${BASE_URL}/api/Point/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(point)
      });
      if (!response.ok) throw new Error('Failed to update point');
      console.log('Point updated successfully');
    },
    async deletePoint(id) {
      console.log('Deleting point:', id);
      const response = await fetch(`${BASE_URL}/api/Point/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete point');
      console.log('Point deleted successfully');
    },
    async addLineString(lineString) {
      console.log('Adding LineString:', lineString);
      const response = await fetch(`${BASE_URL}/api/LineString`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lineString)
      });
      if (!response.ok) throw new Error('Failed to add lineString');
      const data = await response.json();
      console.log('Added LineString:', data);
      return data;
    },
    async fetchAllLineStrings() {
      console.log('Fetching all LineStrings...');
      const response = await fetch(`${BASE_URL}/api/LineString`);
      if (!response.ok) throw new Error('Failed to fetch LineStrings');
      const data = await response.json();
      console.log('Fetched LineStrings:', data);
      return data;
    },
    async deleteLineString(id) {
      console.log('Deleting LineString:', id);
      const response = await fetch(`${BASE_URL}/api/LineString/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete LineString');
      console.log('LineString deleted successfully');
    },
    async addPolygon(polygon) {
      console.log('Adding Polygon:', polygon);
      const response = await fetch(`${BASE_URL}/api/Polygon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(polygon)
      });
      if (!response.ok) throw new Error('Failed to add polygon');
      const data = await response.json();
      console.log('Added Polygon:', data);
      return data;
    },
    async fetchAllPolygons() {
      console.log('Fetching all Polygons...');
      const response = await fetch(`${BASE_URL}/api/Polygon`);
      if (!response.ok) throw new Error('Failed to fetch Polygons');
      const data = await response.json();
      console.log('Fetched Polygons:', data);
      return data;
    },
    async deletePolygon(id) {
      console.log('Deleting Polygon:', id);
      const response = await fetch(`${BASE_URL}/api/Polygon/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete Polygon');
      console.log('Polygon deleted successfully');
    },
  };

  // Notification function
  function showNotification(message, type) {
    console.log('Showing notification:', message, type);
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type}`;
    elements.notification.style.display = 'block';

    setTimeout(() => {
      elements.notification.style.display = 'none';
    }, 3000);
  }

  // Load all points
  async function loadAllPoints() {
    console.log('Loading all points...');
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
        console.log(`Added ${data.value.length} points to the map`);
      } else {
        console.log('No points data or invalid data structure');
      }
    } catch (error) {
      console.error('Error loading points:', error);
      showNotification('Failed to load points. Please try again.', 'error');
    }
  }

  async function loadAllLineStrings() {
    console.log('Loading all LineStrings...');
    try {
      const data = await api.fetchAllLineStrings();
      if (data && data.value && Array.isArray(data.value)) {
        const lineStringSource = map.getLayers().getArray()[3].getSource();
        lineStringSource.clear();
        data.value.forEach(lineString => {
          const coordinates = lineString.coordinates.split(',').map(Number);
          const projectedCoords = [];
          for (let i = 0; i < coordinates.length; i += 2) {
            projectedCoords.push(ol.proj.fromLonLat([coordinates[i], coordinates[i + 1]]));
          }
          const feature = new ol.Feature({
            geometry: new ol.geom.LineString(projectedCoords),
            id: lineString.id,
            name: lineString.name
          });
          lineStringSource.addFeature(feature);
        });
        console.log(`Added ${data.value.length} LineStrings to the map`);
      } else {
        console.log('No LineString data or invalid data structure');
      }
    } catch (error) {
      console.error('Error loading LineStrings:', error);
      showNotification('Failed to load LineStrings. Please try again.', 'error');
    }
  }

  async function loadAllPolygons() {
    console.log('Loading all Polygons...');
    try {
      const data = await api.fetchAllPolygons();
      if (data && data.value && Array.isArray(data.value)) {
        const polygonSource = map.getLayers().getArray()[4].getSource();
        polygonSource.clear();
        data.value.forEach(polygon => {
          const coordinates = polygon.coordinates.split(',').map(Number);
          const projectedCoords = [];
          for (let i = 0; i < coordinates.length; i += 2) {
            projectedCoords.push(ol.proj.fromLonLat([coordinates[i], coordinates[i + 1]]));
          }
          const feature = new ol.Feature({
            geometry: new ol.geom.Polygon([projectedCoords]),
            id: polygon.id,
            name: polygon.name
          });
          polygonSource.addFeature(feature);
        });
        console.log(`Added ${data.value.length} Polygons to the map`);
      } else {
        console.log('No Polygon data or invalid data structure');
      }
    } catch (error) {
      console.error('Error loading Polygons:', error);
      showNotification('Failed to load Polygons. Please try again.', 'error');
    }
  }

  // Handle save click
  async function handleSaveClick() {
    console.log('Handling save click');
    const point = {
      pointX: parseFloat(elements.pointX.textContent),
      pointY: parseFloat(elements.pointY.textContent),
      Name: elements.Name.value
    };

    try {
      await api.addPoint(point);
      await loadAllPoints();
      resetUI();
      showNotification('Point added successfully!', 'success');
    } catch (error) {
      console.error('Error adding point:', error);
      showNotification('Failed to add point. Please try again.', 'error');
    }
  }

  // Reset UI after point addition
  function resetUI() {
    console.log('Resetting UI');
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
    console.log('Map clicked');
    if (mapUpdateMode) {
      handleMapUpdateMode(event);
    } else if (interaction) {
      handlePointAddition(event);
    }
  }

  // Handle map update mode
  async function handleMapUpdateMode(event) {
    console.log('Handling map update mode');
    const coord = ol.proj.toLonLat(event.coordinate);
    const updatedPoint = { pointX: coord[0], pointY: coord[1] };
    try {
      await api.updatePoint(currentUpdateId, updatedPoint);
      mapUpdateMode = false;
      map.getViewport().style.cursor = 'default';
      await loadAllPoints();
      await loadPointsTable();
      showNotification('Point updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating point:', error);
      showNotification('Failed to update point. Please try again.', 'error');
    }
  }

  // Handle point addition
  function handlePointAddition(event) {
    console.log('Handling point addition');
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
    console.log('Positioning panel');
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
    console.log('Loading points table');
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
        scrollY: '100%',
        scrollX: true,
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
          
          // Yeniden boyutlandırma işlemi tamamlandığında tabloyu yeniden çiz
          var resizeTimer;
          $('.dataTables_wrapper').on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
              dataTable.columns.adjust().draw();
            }, 250);
          });
        }
      });

      addTableEventListeners();

      // ResizeObserver API'sini kullanarak daha güvenilir bir yeniden boyutlandırma çözümü
      if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(entries => {
          for (let entry of entries) {
            if (entry.target.classList.contains('dataTables_wrapper')) {
              dataTable.columns.adjust().draw();
            }
          }
        });

        ro.observe(document.querySelector('.dataTables_wrapper'));
      }
    } catch (error) {
      console.error('Error loading points:', error);
      showNotification('Failed to load points table. Please try again.', 'error');
    }
  }

  async function loadLineStringsTable() {
    console.log('Loading LineStrings table');
    try {
      const data = await api.fetchAllLineStrings();

      if (lineStringDataTable) {
        lineStringDataTable.destroy();
      }

      lineStringDataTable = $('#linestrings-table').DataTable({
        data: data.value,
        columns: [
          { data: 'name', width: '60%' },
          {
            data: null,
            width: '40%',
            render: (data, type, row) => `
              <button class="action-btn show-btn" data-id="${row.id}">Show</button>
              <button class="action-btn delete-btn" data-id="${row.id}">Delete</button>
            `
          }
        ],
        scrollY: '100%',
        scrollX: true,
        scrollCollapse: true,
        paging: true,
        columnDefs: [
          { targets: '_all', className: 'dt-head-left' }
        ],
        initComplete: function(settings, json) {
          // Yeniden boyutlandırma işlemi
          var resizeTimer;
          $('.dataTables_wrapper').on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
              lineStringDataTable.columns.adjust().draw();
            }, 250);
          });
        }
      });

      addLineStringTableEventListeners();
    } catch (error) {
      console.error('Error loading LineStrings:', error);
      showNotification('Failed to load LineStrings table. Please try again.', 'error');
    }
  }

  async function loadPolygonsTable() {
    console.log('Loading Polygons table');
    try {
      const data = await api.fetchAllPolygons();

      if (polygonDataTable) {
        polygonDataTable.destroy();
      }

      polygonDataTable = $('#polygons-table').DataTable({
        data: data.value,
        columns: [
          { data: 'name', width: '60%' },
          {
            data: null,
            width: '40%',
            render: (data, type, row) => `
              <button class="action-btn show-btn" data-id="${row.id}">Show</button>
              <button class="action-btn delete-btn" data-id="${row.id}">Delete</button>
            `
          }
        ],
        scrollY: '100%',
        scrollX: true,
        scrollCollapse: true,
        paging: true,
        columnDefs: [
          { targets: '_all', className: 'dt-head-left' }
        ],
        initComplete: function(settings, json) {
          // Yeniden boyutlandırma işlemi
          var resizeTimer;
          $('.dataTables_wrapper').on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
              polygonDataTable.columns.adjust().draw();
            }, 250);
          });
        }
      });

      addPolygonTableEventListeners();
    } catch (error) {
      console.error('Error loading Polygons:', error);
      showNotification('Failed to load Polygons table. Please try again.', 'error');
    }
  }

  // Add table event listeners
  function addTableEventListeners() {
    console.log('Adding table event listeners');
    $('#points-table').on('click', '.update-btn', function() {
      currentUpdateId = $(this).data('id');
      elements.updateOptions.style.display = 'block';
    });

    $('#points-table').on('click', '.show-btn', function() {
      showPoint($(this).data('id'));
    });

    $('#points-table').on('click', '.delete-btn', function() {
      showDeleteConfirmation($(this).data('id'), 'point');
    });

    elements.closeUpdateOptions.addEventListener('click', () => {
      elements.updateOptions.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target == elements.updateOptions) {
        elements.updateOptions.style.display = 'none';
      }
    });
  }

  function addLineStringTableEventListeners() {
    $('#linestrings-table').on('click', '.show-btn', function() {
      showLineString($(this).data('id'));
    });

    $('#linestrings-table').on('click', '.delete-btn', function() {
      showDeleteConfirmation($(this).data('id'), 'linestring');
    });
  }

  function addPolygonTableEventListeners() {
    $('#polygons-table').on('click', '.show-btn', function() {
      showPolygon($(this).data('id'));
    });

    $('#polygons-table').on('click', '.delete-btn', function() {
      showDeleteConfirmation($(this).data('id'), 'polygon');
    });
  }

  // Update point
  async function updatePoint(id, method) {
    console.log('Updating point:', id, method);
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

          selectedFeature = vectorSource.getFeatures().find(f => f.get('id') === id);
          if (selectedFeature) {
            selectedFeature.setStyle(styles.selected);
            
            map.getView().animate({
              center: selectedFeature.getGeometry().getCoordinates(),
              zoom: 7,
              duration: 1000
            });

            dragInteraction = new ol.interaction.Translate({
              features: new ol.Collection([selectedFeature])
            });
            map.addInteraction(dragInteraction);

            dragInteraction.on('translateend', () => {
              elements.mapUpdateSaveBtn.style.display = 'block';
            });

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
                showNotification('Point updated successfully!', 'success');
              } catch (error) {
                console.error('Error updating point:', error);
                showNotification('Failed to update point. Please try again.', 'error');
              }
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching point data:', error);
      showNotification('Failed to fetch point data. Please try again.', 'error');
    }
  }
  
  // Reset map update UI
  function resetMapUpdateUI() {
    console.log('Resetting map update UI');
    if (dragInteraction) {
      map.removeInteraction(dragInteraction);
    }
    if (selectedFeature) {
      selectedFeature.setStyle(null);
    }
    elements.mapUpdateSaveBtn.style.display = 'none';
  }

  // Show point
  function showPoint(id) {
    console.log('Showing point:', id);
    const feature = vectorSource.getFeatures().find(f => f.get('id') === id);
    if (feature) {
      previousZoom = map.getView().getZoom();
      previousCenter = map.getView().getCenter();

      elements.queryPanel.style.display = 'none';
      elements.returnToPanel.style.display = 'block';

      map.getView().animate({
        center: feature.getGeometry().getCoordinates(),
        zoom: 10,
        duration: 1000
      });
    }
  }

  function showLineString(id) {
    console.log('Showing LineString:', id);
    const feature = map.getLayers().getArray()[3].getSource().getFeatures().find(f => f.get('id') === id);
    if (feature) {
      previousZoom = map.getView().getZoom();
      previousCenter = map.getView().getCenter();

      elements.lineStringQueryPanel.style.display = 'none';
      elements.returnToPanel.style.display = 'block';

      const extent = feature.getGeometry().getExtent();
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      });
    }
  }

  function showPolygon(id) {
    console.log('Showing Polygon:', id);
    const feature = map.getLayers().getArray()[4].getSource().getFeatures().find(f => f.get('id') === id);
    if (feature) {
      previousZoom = map.getView().getZoom();
      previousCenter = map.getView().getCenter();

      elements.polygonQueryPanel.style.display = 'none';
      elements.returnToPanel.style.display = 'block';

      const extent = feature.getGeometry().getExtent();
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      });
    }
  }
  
  // Show delete confirmation
  function showDeleteConfirmation(id, type) {
    console.log(`Showing delete confirmation for ${type}:`, id);
    elements.confirmationPanel.style.display = 'block';
    elements.confirmDelete.onclick = () => deleteGeometry(id, type);
    elements.cancelDelete.onclick = () => elements.confirmationPanel.style.display = 'none';
  }

  // Delete geometry
  async function deleteGeometry(id, type) {
    console.log(`Deleting ${type}:`, id);
    try {
      if (type === 'point') {
        await api.deletePoint(id);
        await loadPointsTable();
        await loadAllPoints();
      } else if (type === 'linestring') {
        await api.deleteLineString(id);
        await loadLineStringsTable();
        await loadAllLineStrings();
      } else if (type === 'polygon') {
        await api.deletePolygon(id);
        await loadPolygonsTable();
        await loadAllPolygons();
      }
      elements.confirmationPanel.style.display = 'none';
      showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`, 'success');
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      showNotification(`Failed to delete ${type}. Please try again.`, 'error');
    }
  }

  function startPolygonDraw() {
    console.log('Starting Polygon draw');
    closePolygonPanel();
    
    drawInteraction = new ol.interaction.Draw({
      source: map.getLayers().getArray()[4].getSource(),
      type: 'Polygon'
    });

    map.addInteraction(drawInteraction);
    map.getViewport().style.cursor = 'crosshair';

    elements.finishPolygonDrawingBtn.style.display = 'block';

    drawInteraction.on('drawend', (event) => {
      polygonFeature = event.feature;
      showPolygonNamePanel();
    });
  }

  function showPolygonNamePanel() {
    console.log('Showing Polygon name panel');
    elements.polygonPanel.style.display = 'block';
    positionPanel(elements.polygonPanel);
  }

  async function savePolygon() {
    console.log('Saving Polygon');
    const name = elements.polygonName.value;
    const coordinates = polygonFeature.getGeometry().getCoordinates()[0]; // İlk halka
    
    const flatCoordinates = coordinates.flatMap(coord => {
      const [lon, lat] = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
      return [lon.toFixed(6), lat.toFixed(6)];
    });

    const polygon = {
      name: name,
      coordinates: flatCoordinates.join(',')
    };

    try {
      await api.addPolygon(polygon);
      showNotification('Polygon added successfully!', 'success');
      closePolygonPanel();
      await loadAllPolygons();
    } catch (error) {
      console.error('Error adding Polygon:', error);
      showNotification('Failed to add Polygon. Please try again.', 'error');
    }
  }

  function closePolygonPanel() {
    console.log('Closing Polygon panel and resetting UI');
    elements.polygonPanel.style.display = 'none';
    elements.finishPolygonDrawingBtn.style.display = 'none';
    elements.polygonName.value = '';
    map.removeInteraction(drawInteraction);
    map.getViewport().style.cursor = 'default';
  }

  // LineString drawing function
  function startLineStringDraw() {
    console.log('Starting LineString draw');
    closeLineStringPanel(); // Clear previous drawing
    
    drawInteraction = new ol.interaction.Draw({
      source: map.getLayers().getArray()[3].getSource(),
      type: 'LineString'
    });
  
    map.addInteraction(drawInteraction);
    map.getViewport().style.cursor = 'crosshair';
  
    elements.finishDrawingBtn.style.display = 'block';
  
    drawInteraction.on('drawend', (event) => {
      lineStringFeature = event.feature;
      showLineStringNamePanel();
    });
  }

  // Show LineString name panel
  function showLineStringNamePanel() {
    console.log('Showing LineString name panel');
    elements.lineStringPanel.style.display = 'block';
    positionPanel(elements.lineStringPanel);
  }

  // Save LineString function
  async function saveLineString() {
    console.log('Saving LineString');
    const name = elements.lineStringName.value;
    const coordinates = lineStringFeature.getGeometry().getCoordinates();
    
    const flatCoordinates = coordinates.flatMap(coord => {
      const [lon, lat] = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
      return [lon.toFixed(6), lat.toFixed(6)];
    });
  
    const lineString = {
      name: name,
      coordinates: flatCoordinates.join(',')
    };
  
    try {
      await api.addLineString(lineString);
      showNotification('LineString added successfully!', 'success');
      closeLineStringPanel();
      await loadAllLineStrings(); // Update map
    } catch (error) {
      console.error('Error adding LineString:', error);
      showNotification('Failed to add LineString. Please try again.', 'error');
    }
  }
  
  // Close LineString panel and reset UI
  function closeLineStringPanel() {
    console.log('Closing LineString panel and resetting UI');
    elements.lineStringPanel.style.display = 'none';
    elements.finishDrawingBtn.style.display = 'none';
    elements.lineStringName.value = '';
    map.removeInteraction(drawInteraction);
    map.getViewport().style.cursor = 'default';
  }

  // Event listeners
  elements.addPolygonBtn.addEventListener('click', startPolygonDraw);

  elements.finishPolygonDrawingBtn.addEventListener('click', () => {
    console.log('Finish polygon drawing button clicked');
    if (drawInteraction) {
      map.removeInteraction(drawInteraction);
      showPolygonNamePanel();
    }
  });

  elements.savePolygonBtn.addEventListener('click', savePolygon);

  // Polygon panel close button event listener
  document.querySelector('#polygon-panel .close-panel-btn').addEventListener('click', closePolygonPanel);

  elements.addLineStringBtn.addEventListener('click', startLineStringDraw);

  elements.finishDrawingBtn.addEventListener('click', () => {
    console.log('Finish drawing button clicked');
    if (drawInteraction) {
      map.removeInteraction(drawInteraction);
      showLineStringNamePanel();
    }
  });

  elements.saveLineStringBtn.addEventListener('click', saveLineString);

  // LineString panel close button event listener
  document.querySelector('#linestring-panel .close-panel-btn').addEventListener('click', closeLineStringPanel);

  elements.addPointBtn.addEventListener('click', () => {
    console.log('Add point button clicked');
    if (!interaction) {
      interaction = new ol.interaction.Select({
        layers: [map.getLayers().getArray()[0]]
      });
      map.addInteraction(interaction);
      map.getViewport().style.cursor = 'crosshair';
    }
  });

  elements.queryBtn.addEventListener('click', async () => {
    console.log('Query button clicked');
    elements.queryPanel.style.display = 'block';
    await loadPointsTable();
  });

  elements.queryLineStringBtn.addEventListener('click', async () => {
    console.log('Query LineString button clicked');
    elements.lineStringQueryPanel.style.display = 'block';
    await loadLineStringsTable();
  });

  elements.queryPolygonBtn.addEventListener('click', async () => {
    console.log('Query Polygon button clicked');
    elements.polygonQueryPanel.style.display = 'block';
    await loadPolygonsTable();
  });

  elements.updateSaveBtn.addEventListener('click', async () => {
    console.log('Update save button clicked');
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
      showNotification('Point updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating point:', error);
      showNotification('Failed to update point. Please try again.', 'error');
    }
  });

  elements.closeLineStringBtn.addEventListener('click', () => {
    console.log('Close LineString button clicked');
    elements.lineStringQueryPanel.style.display = 'none';
    if (lineStringDataTable) {
      lineStringDataTable.destroy();
      lineStringDataTable = null;
    }
  });
  
  elements.closePolygonBtn.addEventListener('click', () => {
    console.log('Close Polygon button clicked');
    elements.polygonQueryPanel.style.display = 'none';
    if (polygonDataTable) {
      polygonDataTable.destroy();
      polygonDataTable = null;
    }
  });

  elements.updateCancelBtn.addEventListener('click', () => {
    console.log('Update cancel button clicked');
    elements.updatePanel.style.display = 'none';
  });

  elements.closeBtn.addEventListener('click', () => {
    console.log('Close button clicked');
    elements.queryPanel.style.display = 'none';
    if (dataTable) {
      dataTable.destroy();
      dataTable = null;
    }
  });

  elements.panelUpdate.addEventListener('click', () => {
    console.log('Panel update button clicked');
    updatePoint(currentUpdateId, 'panel');
    elements.updateOptions.style.display = 'none';
  });

  elements.mapUpdate.addEventListener('click', () => {
    console.log('Map update button clicked');
    updatePoint(currentUpdateId, 'map');
    elements.updateOptions.style.display = 'none';
  });

  // Close panel button event listener
  document.querySelector('.close-panel-btn').addEventListener('click', () => {
    console.log('Close panel button clicked');
    elements.panel.style.display = 'none';
    resetUI();
  });

  elements.returnToPanel.addEventListener('click', () => {
    console.log('Returning to panel');
    map.getView().animate({
      center: previousCenter,
      zoom: previousZoom,
      duration: 1000
    });

    elements.queryPanel.style.display = 'block';
    elements.returnToPanel.style.display = 'none';
  });

  // Initialize
  try {
    console.log('Starting initialization...');
    initializeMap();
    console.log('Map initialized, loading points...');
    await loadAllPoints();
    console.log('Points loaded, loading LineStrings...');
    await loadAllLineStrings();
    console.log('LineStrings loaded, loading Polygons...');
    await loadAllPolygons();
    console.log('Polygons loaded, setting up event listeners...');
    map.on('click', handleMapClick);
    addTableEventListeners();
    console.log('Initialization complete');
  } catch (error) {
    console.error('Error during initialization:', error);
    showNotification('An error occurred during initialization. Please refresh the page.', 'error');
  }
});