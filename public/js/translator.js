/* eslint-disable no-var */
/* eslint-disable require-jsdoc */
var translatorBtn = document.getElementById('translate');
var layoutDefault = document.getElementById('layoutDefault');
var navContainer = document.getElementById('nav-container');

translatorBtn.addEventListener('click', translate);
translatorBtn.addEventListener('click', addMarginTop);

function translate() {
  var translator = document.getElementById('translator');
  translator.className = 'mt-2';
}

function addMarginTop() {
  layoutDefault.className = 'mt-5';
  navContainer.className += ' mt-5';
}

function addStyleClassToHTML() {
  if (document.getElementsByClassName('goog-te-combo')[0]) {
    document.getElementsByClassName('goog-te-combo')[0].addEventListener('change', addMarginTop);
  }
  if (document.getElementsByClassName('goog-te-banner-frame').length) {
    addMarginTop();
  }
}
