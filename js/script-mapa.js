/**
 * ******************************************************************
 *
 * Scripts do app de criação, gravação e exclusão de rotas
 *
 * Autores:
 * Janaina, Mariana, Pedro
 *
 * Junho/2021
 * Belo Horizonte, Brasil
 *
 * ******************************************************************
 */

/**
 *
 * Verifica a autenticação.
 *
 * Caso não exista nenhum usuário logago, o sistema volta para a tela de login
 */

// Declarando a variável que vai receber o array com a lista de usuários
var listaUsuarios;

// Checando se existe alguma lista no localstorage
if (window.localStorage.usuarios) {
    // Se sim, grava essa lista na variável acima
    listaUsuarios = JSON.parse(window.localStorage.usuarios);
} else {
    // Se não, abrir a página de login
    window.open("/index.html", "_self");
}

// Cria uma variável global chamada "usuarioLogado", que...
// ...vai receber o objeto usuário que está dentro da lista de usuários (variável listaUsuarios acima).
// Para encontrar apenas o objeto do usuário que está logado, ...
// ... usamos o método "find" para localizar esse objeto pelo login/email que...
// ...foi gravado na sessionStorage pela tela de login.
// Caso nada seja encontrado, a variável "usuarioLogado" recebe null.
window.usuarioLogado =
    listaUsuarios.find(
        (item) => item.email === window.sessionStorage.usuarioLogado
    ) || null;

// Se a variavel global "usuarioLogado" for nula, carregar a tela de login.
if (!usuarioLogado) {
    window.open("/index.html", "_self");
}

// Escreve o nome do usuário logado no botão "Para onde vamos..."
var domNome = document.querySelector("#btn-para-onde b");
domNome.textContent = usuarioLogado.nome.split(" ")[0];

/**
 *
 * Adiciona o script da API do Google Maps.
 *
 * Cria a tag script dinamicamente, para não expor a chave da API para o público.
 */
var googleMapsScript = document.createElement("script");

googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&region=BR&language=pt-BR&libraries=places&callback=initMap`;
googleMapsScript.async = true;

// Faz um append do elemento 'script' no 'head' da página
document.head.appendChild(googleMapsScript);

/**
 *
 * Variáveis globais
 *
 * São variáveis que serão usadas por várias funções diferentes.
 * Algumas variáveis são aplicadas diretamente no objeto global window, para facilitar o debug
 */
var infowindow;
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
if (window.localStorage.usuarioLogado) {
    usuarioLogado = JSON.parse(window.localStorage.usuarioLogado);
}
var listaFavoritos = document.querySelector("ul#listaLocais");
var botaoParaOnde = document.querySelector(".para-onde");
var containerLocais = document.querySelector("#containerLocais");
var detalhesRota;

var modalFavoritos = document.querySelector(".modal-favoritos");
var modalFavoritosObj = new bootstrap.Modal(modalFavoritos, {});

var modalFavoritar = document.querySelector(".modal-favoritar");

var modalFavoritarObj = new bootstrap.Modal(modalFavoritar, {});

var btnSalvarRota = modalFavoritar.querySelector("#btn-salvar");
var btnDeletaRota = modalFavoritar.querySelectorAll(".btn-deleta");

var btnDetalhesRota = document.querySelector(".btn.detalhes-rota");
var btnFavoritos = document.querySelector(".btn.favoritos");
var btnIniciarTrajeto = document.querySelector(".btn.iniciar-navegacao");
var btnEncerrarTrajeto = document.querySelector(".btn.encerrar-navegacao");
var latLngInterrupcao;

function getUniqueBy(arr, key) {
    return [...new Map(arr.map((item) => [item[key], item])).values()];
}

/**
 *
 * Função initMap
 *
 * Função que é chamada quando o mapa é iniciado
 */

window.initMap = function initMap() {
    // Instância do mapa grada na variável "myMap" no objeto global "window"
    window.myMap = new google.maps.Map(document.getElementById("map"), {
        mapTypeControl: false,
        center: { lat: -19.8573741, lng: -43.9108319 },
        zoom: 15.3,
    });

    // Cria uma instância para o autocomplete
    new AutocompleteDirectionsHandler(myMap);

    // Centraliza o mapa na localização atual do aparelho
    // Para isso, pega as coordenadas atuais do navegador
    (async function getLocation() {
        await navigator.geolocation.getCurrentPosition((position) =>
            // chama a função para centralizar o mapa, passando adiante as coordenadas
            centralizaMapa(position.coords)
        );
    })();
    // getLocation();

    // Função para centralizar o mapa
    function centralizaMapa(position) {
        myMap.setCenter({
            lat: position.latitude,
            lng: position.longitude,
        });

        var mapService = new google.maps.places.PlacesService(myMap);
        var request = {
            location: {
                lat: position.latitude,
                lng: position.longitude,
            },
            radius: 100,
            type: ["establishment"],
        };
        mapService.nearbySearch(request, (result) => {
            console.log(result);
            // inputOri.value = result[1].vicinity;
            inputOri.value = "Meu local";
            originPlaceId = result[1].place_id;
        });
    }
};
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

    var lugarDeOrigemPlaceId = { placeId: originPlaceId };
    var lugarDeOrigemLatLng = {
        location: {
            lat: myMap.getCenter().lat(),
            lng: myMap.getCenter().lng(),
        },
    };

    // alert(this.originPlaceId);
    console.log(this.destinationPlaceId);

    this.directionsService.route(
        {
            origin: lugarDeOrigemLatLng,
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
                console.log(response.routes[0]);
                detalhesRota = response.routes[0].legs[0];
                inputOri.value = detalhesRota.start_address;
                btnDetalhesRota.disabled = false;
                latLngInterrupcao =
                    detalhesRota.steps[
                        Math.floor(detalhesRota.steps.length / 2)
                    ].end_location;
                preencheDetalhes();

                // favoritar();
            } else {
                window.alert("Directions request failed due to " + status);
            }
        }
    );
};

function getPlaceId(lat, lng, variavelPlaceId) {
    service = new google.maps.places.PlacesService(myMap);
    var request = {
        location: {
            lat: lat,
            lng: lng,
        },
        radius: 100,
        type: ["establishment"],
    };

    service.nearbySearch(request, (result) => {
        variavelPlaceId = result[1].place_id;
    });
}

/**
 *
 * Função alteraDestino
 * **************************
 *
 * Recebe os parametros do novo destino e redesenha a rota.
 * Os parametros podem ser uma string com o placeId ou as coordenadas
 */
function alteraDestino(novasCoordenadas) {
    let novoDestino;
    if (typeof novasCoordenadas == "object") {
        novoDestino = novasCoordenadas;
    } else {
        novoDestino = { placeId: novasCoordenadas };
    }
    // let newDestination = latLng ? latLng : { placeId: novoPlaceId };
    var parametros = {
        origin: { placeId: originPlaceId },
        destination: novoDestino,
        travelMode: "BICYCLING",
    };

    var aplicaDirecao = function (response, status) {
        if (status === "OK") {
            directionsDisplay.setDirections(response);
            console.log(response);
            detalhesRota = response.routes[0].legs[0];
            btnDetalhesRota.disabled = false;
            inputOri.value = detalhesRota.start_address;
            latLngInterrupcao =
                detalhesRota.steps[Math.floor(detalhesRota.steps.length / 2)]
                    .end_location;
            preencheDetalhes();
        } else {
            window.alert("Directions request failed due to " + status);
        }
    };

    //placeChangedListener.destinationPlaceId = destinationPlaceId;

    directionsService.route(parametros, aplicaDirecao);
}

/**
 *
 * Tela inicial
 */

destinationInput.addEventListener("click", () => {
    destinationInput.value = "";
});

var paraOndeCollapse = new bootstrap.Collapse(botaoParaOnde, {
    toggle: false,
});
paraOndeCollapse.show();

var containerLocaisCollapse = new bootstrap.Collapse(containerLocais, {
    toggle: false,
});
containerLocaisCollapse.hide();

botaoParaOnde.querySelector("button").addEventListener("click", () => {
    containerLocaisCollapse.show();
    paraOndeCollapse.hide();
    document.querySelector("body").classList.add("form-open");
});

/**
 *
 *
 * Favoritando a rota
 */

favButon.addEventListener("click", () => {
    // Abre a modal
    modalFavoritarObj.show();
    modalFavoritar.addEventListener("shown.bs.modal", function () {
        console.log("abre modal");
        modalFavoritar.querySelector("#nome-rota").focus();
        modalFavoritar.querySelector("#nome-rota").value =
            detalhesRota.end_address;
    });
});

btnSalvarRota.addEventListener("click", () => {
    var novoNome = modalFavoritar.querySelector("#nome-rota").value;
    destinationPlace.novoNome = novoNome;

    gravaRota();

    modalFavoritarObj.hide();
});

function gravaRota() {
    console.log(destinationPlace);

    usuarioLogado.favDir.push(destinationPlace);
    window.localStorage.usuarioLogado = JSON.stringify(usuarioLogado);
    favButon.disabled = true;
    // // place = null;
    listaUsuarios.forEach((item) => {
        if (item.email === usuarioLogado.email) {
            // console.log(item)
            item.favDir = usuarioLogado.favDir;
        }
    });
    window.localStorage.usuarios = JSON.stringify(listaUsuarios);

    montaLista();
}

function deletaRota(placeId) {
    var novoFavDir = usuarioLogado.favDir.filter(
        (item) => item.place_id !== placeId
    );

    usuarioLogado.favDir = novoFavDir;
    window.localStorage.usuarioLogado = JSON.stringify(usuarioLogado);
    // // place = null;
    listaUsuarios.forEach((item) => {
        if (item.email === usuarioLogado.email) {
            // console.log(item)
            item.favDir = usuarioLogado.favDir;
        }
    });
    window.localStorage.usuarios = JSON.stringify(listaUsuarios);

    montaLista();
}

function montaLista() {
    listaFavoritos.innerHTML = "";

    btnFavoritos.disabled = true;
    modalFavoritarObj.hide();
    if (usuarioLogado.favDir.length > 0) {
        btnFavoritos.disabled = false;
        usuarioLogado.favDir.forEach((fav) => {
            var listaHtml = `
            <li class="list-group-item d-flex justify-content-between" id="${fav.place_id}">
                <button class="d-flex btn-rota">
                    <i class="bi bi-geo-alt me-2"></i>
                    <span class="d-inline-block text-truncate">${fav.novoNome}</span>
                </button>
                <button class="d-flex btn-deleta text-danger">
                    <i class="bi bi-x-circle"></i>
                </button>
            </li>
            `;

            listaFavoritos.innerHTML += listaHtml;
            // listaCollapse.show();
            escutaClick();
        });
    }
}

montaLista();

function escutaClick() {
    var itensListaFavoritos = document.querySelectorAll("#listaLocais li");
    btnDeletaRota = document.querySelectorAll(".btn-deleta");

    if (itensListaFavoritos) {
        itensListaFavoritos.forEach((item) => {
            item.querySelector("button").addEventListener("click", (evento) => {
                // console.log(item.id)

                alteraDestino(item.id);
                modalFavoritosObj.hide();
            });
        });
    }

    btnDeletaRota.forEach((btn) => {
        btn.addEventListener("click", () => {
            let placeIdToRemove = btn.parentNode.id;
            // console.log(placeIdToRemove);
            deletaRota(placeIdToRemove);
        });
    });
}

escutaClick();

// var listaFavoritosId = document.getElementById('listaLocais')

function preencheDetalhes() {
    var listaDetalhes = document.querySelector("#listaDetalhes");
    listaDetalhes.querySelector("#duracao b").textContent =
        detalhesRota.duration.text;
    listaDetalhes.querySelector("#distancia b").textContent =
        detalhesRota.distance.text;
    listaDetalhes.querySelector("#calorias b").textContent =
        calculaCalorias() + " Kcal";

    habilitaIniciarTrajeto();
}

function calculaCalorias() {
    //0,049 x (Seu peso x 2,2) x Total de minutos de prática = Calorias queimadas.
    const multiplicadorGeral = 0.049;
    const multiplicadorPeso = 2.2;
    let peso = usuarioLogado.peso || 60;
    let duracao = detalhesRota.duration.value / 60;

    return Math.round(peso * multiplicadorPeso * multiplicadorGeral * duracao);
}

/**
 *
 * Iniciar trajeto
 */

function habilitaIniciarTrajeto() {
    setTimeout(() => {
        btnIniciarTrajeto.disabled = false;
    }, 2000);

    btnIniciarTrajeto.addEventListener("click", () => {
        document.querySelector("body").classList.add("nav-open");
        btnDetalhesRota.classList.add("hide");
        btnFavoritos.classList.add("hide");

        myMap.setCenter({
            lat: detalhesRota.start_location.lat(),
            lng: detalhesRota.start_location.lng(),
        });

        myMap.setZoom(22);

        setTimeout(() => {
            btnIniciarTrajeto.disabled = true;
            btnEncerrarTrajeto.disabled = false;
        }, 1000);
    });
}

/**
 *
 * Encerrar trajeto
 */
btnEncerrarTrajeto.addEventListener("click", () => {
    alteraDestino({
        lat: latLngInterrupcao.lat(),
        lng: latLngInterrupcao.lng(),
    });
    document.querySelector("body").classList.remove("nav-open");
    btnEncerrarTrajeto.disabled = true;
    btnDetalhesRota.classList.remove("hide");
    btnFavoritos.classList.remove("hide");
});
