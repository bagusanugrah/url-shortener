var translatorBtn = document.getElementById('translate');
translatorBtn.addEventListener('click', translate);

function translate() {
  var translator = document.getElementById('translator');
  translator.className = 'mt-2';
}

function addMarginTop() {
  var layoutDefault = document.getElementById('layoutDefault');
  var navContainer = document.getElementById('nav-container');

  if (document.getElementsByClassName('goog-te-banner-frame').length !== 0){
    layoutDefault.className = 'mt-5';
    navContainer.className += ' mt-5';
  }
}

function addToConsole(){
  console.log(document.getElementsByClassName('goog-te-combo')[0].addEventListener('change', addMarginTop));
}
