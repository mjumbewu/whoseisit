var Who = Who || {};

(function(W) {

  W.initMap = function() {
    W.map = L.map('map');
    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png',
      cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
      cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttribution});
    W.map.setView([51.505, -0.09], 18).addLayer(cloudmade);
  }
  
  W.initLocation = function() {
    navigator.geolocation.getCurrentPosition(
      // success
      function(position) {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        W.setMarkerLocation([latitude, longitude]);
        W.map.panTo([latitude, longitude]);
      }, 
      // fail
      function() {
        alert('Oops, could not find you.');
      }
    );

//    W.setMarkerLocation([39.948174225938324,-75.20690917968749]);
//    W.map.panTo([39.948174225938324,-75.20690917968749]);
    
  }

  W.setMarkerLocation = function(latLng) {
    if (!W.meMarker) {
      W.meMarker = L.marker(latLng).addTo(W.map);
    } else {
      W.meMarker.setLatLng(latLng);
    }
  };
  
  W.ParcelModel = Backbone.Model.extend({
    idAttribute: 'objectid',
    
    syncOpaData: function(options) {
      var address = this.get('house') + ' ' + this.get('stdir') + ' ' + this.get('stnam') + ' ' + this.get('stdes'),
          self = this,
          origSuccess = options.success;
          
      $.ajax(_.extend(options, {
        url: W.config.opaSourceRoot + address,
        type: 'GET',
        success: function(data) {
          self.properties = data.properties || [data.property];
          if (origSuccess) { origSuccess.apply(this, arguments); }
        }
      }));
    }
  });
  
  W.ParcelCollection = Backbone.Collection.extend({
    model: W.ParcelModel,
    url: W.config.parcelSourceRoot,
    
    sync: function(method, models, options) {
      options = options || {};
      options.data = options.data || {};
      options.data.format = 'jsonp';
      options.dataType = 'jsonp';
      if (this.center && this.bounds) {
        // make leaflet objects, in case they're simple arrays.
        this.center = L.latLng(this.center);
        this.bounds = L.latLngBounds(this.bounds);
        
        options.data.near = this.center.lat + ',' + this.center.lng;
        options.data.intersecting = this.bounds._northEast.lat + ',' + this.bounds._northEast.lng + ',' + 
                                    this.bounds._southWest.lat + ',' + this.bounds._southWest.lng;
      }
      return Backbone.sync(method, models, options);
    },
    
    parse: function(data, options) {
      return Backbone.Collection.prototype.parse.call(this, data.results, options);
    }
  });
  
  W.getCurrentCenter = function() {
    return W.map.getCenter();
  };
  
  W.getCurrentBounds = function() {
    return W.map.getBounds();
  };
  
  W.updateParcels = function() {
    W.parcels.center = W.getCurrentCenter();
    W.parcels.bounds = W.getCurrentBounds();
    W.parcels.fetch({add: true});
  };
  
  W.addParcel = function(parcel) {
    var geoData = JSON.parse(parcel.get('shape'));
    parcel.layer = L.geoJson(geoData, {
      style: function(feature) { return {color: 'grey'}; }
    }).addTo(W.map);
    
    parcel.syncOpaData({
      success: function() {
        var popupContent = '';
        
        if (parcel.properties && parcel.properties[0]) {
          parcel.layer.setStyle(function(feature) {
            return {color: (parcel.properties.length === 1 ? 'green' : 'blue')};
          });
          $.each(parcel.properties, function(i, property) {
//            if (!property)
//              debugger;
            var info = property.account_information || property;
            popupContent +=
              '<p><b>' + info.address + '</b></p>' +
              '<p>Owner: ' + info.owners[0] + '</p>';
          });
        }
        
        else {
          parcel.layer.setStyle(function(feature) {
            return {color: 'red'};
          });
          popupContent = '<p>No properties on the parcel.</p>';
        }
        
        parcel.layer.bindPopup(popupContent);
      }
    });
  };

  $(function() {
  
    W.initMap();
    W.initLocation();
    
    W.parcels = new W.ParcelCollection();
    W.map.on('moveend', function() { W.updateParcels(); });
    W.parcels.on('add', function(parcel) { W.addParcel(parcel); });
    W.updateParcels();
    
    $('#locate-me-btn').click(function(evt) {
      evt.preventDefault();
      
    });
    
  });

})(Who);
