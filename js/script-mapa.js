// Create the script tag, set the appropriate attributes
var listaUsuarios;
if (window.localStorage.usuarios) {
    listaUsuarios = JSON.parse(window.localStorage.usuarios);
} else {
    window.open("/index.html","_self")

}
window.usuarioLogado = listaUsuarios.find((item)=>item.email === window.sessionStorage.usuarioLogado) || null;

if (!usuarioLogado) {
    window.open("/index.html","_self")
}

var domNome = document.querySelector("#btn-para-onde b");
domNome.textContent = usuarioLogado.nome.split(' ')[0];

var script = document.createElement("script");

script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initMap`;
script.async = true;

// Append the 'script' element to 'head'
document.head.appendChild(script);


var infowindow;
/**
 * Variáveis globais
 */
var originPlaceId = null;
var destinationPlaceId = null;
var destinationPlace;
var inputOri = document.querySelector("#origin-input");
window.newMarker;
var placeChangedListener;
var setRoute;
var originInput = document.getElementById("origin-input");
var destinationInput = document.getElementById("destination-input");
var favButon = document.querySelector("#favoritar");
var directionsService;
var directionsDisplay;
usuarioLogado.favDir = [];
if (window.localStorage.usuarioLogado) {
    usuarioLogado.favDir = JSON.parse(window.localStorage.usuarioLogado);
}
var listaFavoritos = document.querySelector('.lista-favoritos ul');
var botaoParaOnde = document.querySelector('.para-onde');
var containerLocais = document.querySelector('#containerLocais')


/**
 *
 * Função que é chamada quando o mapa é iniciado
 */
window.initMap = function initMap() {
    window.myMap = new google.maps.Map(document.getElementById("map"), {
        mapTypeControl: false,
        center: { lat: -19.8573741, lng: -43.9108319 },
        zoom: 15.3,
    });
    new AutocompleteDirectionsHandler(myMap);
    async function getLocation() {
        await navigator.geolocation.getCurrentPosition((position) =>
            setNewCenter(position.coords)
        );
    }

    getLocation();

    function setNewCenter(position) {
        myMap.setCenter({
            lat: position.latitude,
            lng: position.longitude,
        });

        service = new google.maps.places.PlacesService(myMap);
        var request = {
            location: {
                lat: position.latitude,
                lng: position.longitude,
            },
            radius: 100,
            type: ["establishment"],
        };
        service.nearbySearch(request, (result) => {
            console.log(result[1]);
            inputOri.value = result[1].vicinity;
            originPlaceId = result[1].place_id;
        });
    }
};

/**
 * @constructor
 */
function AutocompleteDirectionsHandler(map) {
    this.map = map;
    this.originPlaceId = originPlaceId;
    this.destinationPlaceId = destinationPlaceId;
    this.travelMode = "BICYCLING";

    var modeSelector = document.getElementById("mode-selector");
    directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer();
    this.directionsService = directionsService;
    this.directionsDisplay = directionsDisplay;
    this.directionsDisplay.setMap(map);

    var originAutocomplete = new google.maps.places.Autocomplete(originInput, {
        fields: ["place_id", "name", "types"],
    });
    var destinationAutocomplete = new google.maps.places.Autocomplete(
        destinationInput,
        { fields: ["place_id", "name", "types"] }
    );

    // this.setupClickListener("changemode-walking", "WALKING");
    // this.setupClickListener("changemode-transit", "TRANSIT");
    // this.setupClickListener("changemode-driving", "DRIVING");

    this.setupPlaceChangedListener(originAutocomplete, "ORIG");
    this.setupPlaceChangedListener(destinationAutocomplete, "DEST");

    // this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
    // this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(destinationInput);
    // this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(modeSelector);
}

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function (
    autocomplete,
    mode
) {
    var me = this;
    autocomplete.bindTo("bounds", this.map);
    autocomplete.addListener("place_changed", function () {
        var place = autocomplete.getPlace();
        if (!place.place_id) {
            window.alert("Please select an option from the dropdown list.");
            return;
        }
        if (mode === "ORIG") {
            originPlaceId = place.place_id;
            me.originPlaceId = place.place_id;
            originPlaceId = place.place_id;
        } else {
            destinationPlaceId = place.place_id;
            me.destinationPlaceId = place.place_id;
        }

        favButon.disabled = false;

        // favoritar(place);
        destinationPlace = place;

        // console.log(place);

        me.route();
    });
};

AutocompleteDirectionsHandler.prototype.route = function () {
    if (!originPlaceId || !this.destinationPlaceId) {
        return;
    }
    var me = this;
    console.log(me);
    setRoute = me;

    // alert(this.originPlaceId);
    console.log(this.destinationPlaceId);

    this.directionsService.route(
        {
            origin: { placeId: originPlaceId },
            destination: { placeId: destinationPlaceId },
            travelMode: "BICYCLING",
        },
        function (response, status) {
            if (status === "OK") {
                directionsDisplay.setDirections(response);

                console.log(response.routes[0].legs[0].start_location.lat());
                console.log(response.routes[0].legs[0].start_location.lng());

                console.log(response.routes[0].legs[0].end_location.lat());
                console.log(response.routes[0].legs[0].end_location.lng());
                console.log(response.routes[0].legs[0]);

                // favoritar();
            } else {
                window.alert("Directions request failed due to " + status);
            }
        }
    );
};



function alteraDestino(novoPlaceId) {
    // var novoEndereco =
    //     "Av. Augusto de Lima, 744 - Centro, Belo Horizonte - MG, 30190-922, Brazil";
    // var destinationPlaceId = "ChIJAz0eA-KZpgARYAFkjcWmbI4";
    // var campoDestino = document.querySelector("#destination-input");

    // campoDestino.value = novoEndereco;

    var parametros = {
        origin: { placeId: originPlaceId },
        destination: { placeId: novoPlaceId },
        travelMode: "BICYCLING",
    };

    var aplicaDirecao = function (response, status) {
        if (status === "OK") {
            directionsDisplay.setDirections(response);
            console.log(response);
        } else {
            window.alert("Directions request failed due to " + status);
        }
    };

    //placeChangedListener.destinationPlaceId = destinationPlaceId;

    directionsService.route(parametros, aplicaDirecao);
}


/**
 * 
 * Favoritos
 */

 destinationInput.addEventListener('click', ()=>{
     destinationInput.value = ''
 })

 var listaCollapse = new bootstrap.Collapse(listaFavoritos, {
    toggle: false
  })
  listaCollapse.show();

  var paraOndeCollapse = new bootstrap.Collapse(botaoParaOnde, {
    toggle: false
  })
  paraOndeCollapse.show();

  var containerLocaisCollapse = new bootstrap.Collapse(containerLocais, {
    toggle: false
  })
  containerLocaisCollapse.hide();

  botaoParaOnde.querySelector('button').addEventListener('click', ()=> {
    containerLocaisCollapse.show();
    paraOndeCollapse.hide()
  })

  /**
   * 
   * Favoritando a rota
   */

 favButon.addEventListener("click", () => {
    // console.log("place", destinationPlace);
    usuarioLogado.favDir.push(destinationPlace);
    console.log('logado', usuarioLogado)
    window.localStorage.usuarioLogado = JSON.stringify(usuarioLogado);
    favButon.disabled = true;
    // place = null;
    listaUsuarios.forEach((item)=> {if (item.email === usuarioLogado.email) {
        console.log(item)
        item.favDir = usuarioLogado.favDir
    }});
    window.localStorage.usuarios = JSON.stringify(listaUsuarios);

    montaLista();
});

function montaLista() {
    listaFavoritos.innerHTML = '';
    if (usuarioLogado.favDir.length > 0) {
        usuarioLogado.favDir.forEach((fav)=> {
            var listaHtml = `
            <li class="list-group-item" id="${fav.place_id}">
                <button class="d-flex">
                    <i class="bi bi-geo-alt me-2"></i>
                    <span class="d-inline-block text-truncate">${fav.name}</span>
                </button>
            </li>
            `;
    
            listaFavoritos.innerHTML += listaHtml;
            listaCollapse.show();
            escutaClick()
        })
    }

}

montaLista()

function escutaClick() {
    var itensListaFavoritos = document.querySelectorAll('.lista-favoritos li');
    
    itensListaFavoritos.forEach((item)=> {
        item.querySelector('button').addEventListener('click', (evento)=> {
            // console.log(item.id)
    
            alteraDestino(item.id);
            listaCollapse.hide();
        })
    })

}

escutaClick()

// var listaFavoritosId = document.getElementById('listaLocais')

