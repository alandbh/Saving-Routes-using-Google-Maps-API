
var none = document.getElementById('name');
var pass = document.getElementById('senha');


function store() {
    localStorage.setItem('nome', none.value);
    localStorage.setItem('senha', pass.value);
}

function check() {

    // stored data from the register-form
    var storedName = localStorage.getItem('nome');
    var storedPw = localStorage.getItem('senha');

    // entered data from the login-form
    var userName = document.getElementById('senhalog');
    var userPw = document.getElementById('nomelog');

    // check if stored data from register-form is equal to data from login form
    if(userName.value != storedName || userPw.value != storedPw) {
        alert('ERROR');
    }else {
        alert('You are loged in.');
    }
}