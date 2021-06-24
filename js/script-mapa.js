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
var originPlaceId = "ChIJMyzPysqQpgARlznSOl55NVs";
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
 * ********************
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

    // Função para centralizar o mapa
    function centralizaMapa(position) {
        myMap.setCenter({
            lat: position.latitude,
            lng: position.longitude,
        });

        //Instancia o mapService para pegar o PlaceID da origem
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

            // Coloca a string "Meu local" no campo de origem
            inputOri.value = "Meu local";

            // Aplica o placeId encontrado na variavel global originPlaceId
            originPlaceId = result[1].place_id;
        });
    }
};

/**
 *
 * Função para o autocomplete
 * ********************
 *
 * Função que vai lidar com todos os eventos do componente de autocomplete
 */
function AutocompleteDirectionsHandler(map) {
    this.map = map;
    this.originPlaceId = originPlaceId;
    this.destinationPlaceId = destinationPlaceId;
    this.travelMode = "BICYCLING";

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

    this.setupPlaceChangedListener(originAutocomplete, "ORIG");
    this.setupPlaceChangedListener(destinationAutocomplete, "DEST");
}

/**
 *
 * Função para aplicar a direção após o autocomplete
 *
 */

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function (
    autocomplete,
    mode
) {
    var me = this;
    autocomplete.bindTo("bounds", this.map);
    autocomplete.addListener("place_changed", function () {
        // Guarda o objeto place na variável place
        var place = autocomplete.getPlace();

        // Verifica se o usuário escolheu algum endereço na lista de sugestões.
        // Se não, emite um alerta.
        if (!place.place_id) {
            window.alert("Selecione um dos locais na lista");
            return;
        }
        if (mode === "ORIG") {
            // Aplica o placeId encontrado na variavel global originPlaceId
            originPlaceId = place.place_id;
            me.originPlaceId = place.place_id;
            // originPlaceId = place.place_id;
        } else {
            // Aplica o placeId encontrado na variavel global destinationPlaceId
            destinationPlaceId = place.place_id;
            me.destinationPlaceId = place.place_id;
        }

        // Assim que um destino for escolhido, habilita o botão de favoritar
        favButon.disabled = false;

        // Aplica o objeto place na variável global destinationPlace
        destinationPlace = place;

        // Desenha a rota com os dados dentro da variavel me.
        me.route();
    });
};

/**
 *
 * Função para aplicar traçar a rota com base no placeId do destino
 *
 */

AutocompleteDirectionsHandler.prototype.route = function () {
    // Se não tem um placeId de origem e nem de destino, encerra a função.
    if (!originPlaceId || !this.destinationPlaceId) {
        return;
    }

    // Monta os objetos de origem e destino para inserir como parametro da função que desenha a rota
    var lugarDeOrigemPlaceId = { placeId: originPlaceId };
    var lugarDeDestinoPlaceId = { placeId: destinationPlaceId };

    // var lugarDeOrigemLatLng = {
    //     location: {
    //         lat: myMap.getCenter().lat(),
    //         lng: myMap.getCenter().lng(),
    //     },
    // };

    // alert(this.originPlaceId);
    console.log(this.destinationPlaceId);

    // Desenha a rota com os parametros de origem e destino
    this.directionsService.route(
        {
            origin: lugarDeOrigemPlaceId,
            destination: lugarDeDestinoPlaceId,
            travelMode: "BICYCLING",
        },
        function (response, status) {
            if (status === "OK") {
                directionsDisplay.setDirections(response);

                console.log(response.routes[0]);

                // Grava os detalhes da rota na variável global
                detalhesRota = response.routes[0].legs[0];

                // Escreve o endereço de origem no campo de origem
                inputOri.value = detalhesRota.start_address;

                // Habilita o botão de detalhes da rota
                btnDetalhesRota.disabled = false;

                // Simula a interrupção da navegação gravando a LatLng na variável global
                // Para isso, dividimos o numero de steps por 2 e arredodamos para cima
                // Os steps são as instruções de direção de cada rota.
                latLngInterrupcao =
                    detalhesRota.steps[
                        Math.floor(detalhesRota.steps.length / 2)
                    ].end_location;

                // Chama a função preencherDetalhes de acordo com a rota que está na variavel detalhesRota
                preencheDetalhes();
            } else {
                window.alert(
                    "A requisição para criar a rota falhou devido a: " + status
                );
            }
        }
    );
};

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

    // Verifica se o parametro é um objeto do tipo {location: {lat: xxx, lng: xxx}}
    // Se sim, usa o mesmo objeto como parametro.
    // Caso contrário, usamos o placeId
    if (typeof novasCoordenadas == "object") {
        novoDestino = novasCoordenadas;
    } else {
        novoDestino = { placeId: novasCoordenadas };
    }

    // Monta o objeto com os parametros da rota a ser criada
    var parametros = {
        origin: { placeId: originPlaceId },
        destination: novoDestino,
        travelMode: "BICYCLING",
    };

    var aplicaDirecao = function (response, status) {
        if (status === "OK") {
            // Desenha a rota em caso de sucesso
            directionsDisplay.setDirections(response);
            console.log(response);

            // Atualiza a variável global com a nova rota
            detalhesRota = response.routes[0].legs[0];

            // Habilita o botão de detalhes da rota
            btnDetalhesRota.disabled = false;

            // Atualiza o texto do campo de origem
            inputOri.value = detalhesRota.start_address;

            // Simula a interrupção da navegação gravando a LatLng na variável global
            // Para isso, dividimos o numero de steps por 2 e arredodamos para cima
            // Os steps são as instruções de direção de cada rota.
            latLngInterrupcao =
                detalhesRota.steps[Math.floor(detalhesRota.steps.length / 2)]
                    .end_location;

            // Chama a função preencherDetalhes de acordo com a rota que está na variavel detalhesRota
            preencheDetalhes();
        } else {
            window.alert(
                "A requisição para criar a rota falhou devido a: " + status
            );
        }
    };

    // Desenha a rota com os parametros de origem e destino
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
