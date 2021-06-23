var listaUsuarios = JSON.parse(window.localStorage.usuarios);
window.usuarioLogado = null;

window.addEventListener("load", function () {

    let formulario = document.querySelector("#login");

    let campoLogin = document.querySelector("#nomelog");
    let campoSenha = document.querySelector("#senhalog");

    
    formulario.onsubmit = (evento)=> {
        evento.preventDefault()
        let senha = campoSenha.value;
        let login = campoLogin.value;
        console.log('submeter')

        let erroTemplate = document.createElement('div');
        erroTemplate.classList.add('w-100')

        let usuarioRegistrado = listaUsuarios.find((item)=>item.email === login) || null;

        if (usuarioRegistrado && usuarioRegistrado.senha === senha) {
            console.log('ok');
            usuarioLogado = usuarioRegistrado;
            window.sessionStorage.usuarioLogado = login;
            window.open("/mapa.html","_self")
        } else {
            erroTemplate.innerHTML = '<small class="text-danger">Senha incorreta<small>';
            campoSenha.parentNode.appendChild(erroTemplate);
        }

        



    }

})