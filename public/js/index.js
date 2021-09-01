/* eslint-disable no-var */
/* eslint-disable require-jsdoc */
// semua script di bawah ini hanya dijalankan di index saat user tidak logged in
if (typeof(Storage) !== 'undefined') {// jika browser mempunyai storage
  var urlsCardElement = document.getElementById('urls-card');
  if (localStorage.getItem('parameters')) {// jika di local storage udah ada isinya
    urlsCardElement.innerHTML = urlsCard();// menampilkan card
    var parameters = localStorage.getItem('parameters');
    loadTable(parameters);// menampilkan table berisi URL-URL
  }
  if (document.getElementById('short-url')) {// jika ada URL pendek yang baru dibuat
    urlsCardElement.innerHTML = urlsCard();// menampilkan card
    var newUrl = document.getElementById('short-url').innerHTML;// mengambil URL baru
    var newParameter = newUrl.split('/')[newUrl.split('/').length - 1];// mengambil parameter dari URL baru
    var parameters = localStorage.getItem('parameters');// mengambil data dari local storage
    var parametersArray = [];
    if (parameters) {// jika di local storage udah ada isinya
      parametersArray = parameters.split(',');// data-data dari local storage dijadikan array
      parametersArray.unshift(newParameter);// data baru dimasukkan ke array data-data lama
      localStorage.setItem('parameters', parametersArray.toString());// menyimpan perubahan pada local storage
      parameters = localStorage.getItem('parameters');// mengambil data dari local storage yang sudah diperbarui
    } else {
      parametersArray.unshift(newParameter);// data baru dimasukkan ke array data-data lama
      localStorage.setItem('parameters', parametersArray.toString());// menyimpan perubahan pada local storage
      parameters = localStorage.getItem('parameters');// mengambil data dari local storage yang sudah diperbarui
    }
    loadTable(parameters);
  }
}

function urlsCard() {
  return `<div class="card mb-4">
  <div class="card-body d-flex justify-content-center">
      <table class="table table-bordered table-striped table-hover">
          <thead>
          <tr>
              <th scope="col" class="text-center">#</th>
              <th scope="col">URL</th>
              <th scope="col" class="text-center">Aksi</th>
          </tr>
          </thead>
          <tbody id="table-body">
          </tbody>
      </table>
  </div>`;
}

function loadTable(parameters) {
  var totalItems = 5;
  var currentURL = window.location.href;
  var currentPage = +currentURL.split('=')[currentURL.split('=').length - 1];
  currentPage = !currentPage ? 1 : currentPage;
  var skip = totalItems * (currentPage-1);

  var parametersArray = parameters.split(',');// data-data dari local storage dijadikan array
  var tableBody = document.getElementById('table-body');
  tableBody.innerHTML = '';
  var number = 1;
  for (var i = 0; i < totalItems; i++) {
    if (typeof(parametersArray[i+skip]) !== 'undefined') {
      var row = document.createElement('tr');// membuat element tr
      row.innerHTML = '<th scope="row" class="text-center">' + number + '</th>';
      row.innerHTML += '<td>' + `<a href="https://idurl.id/${parametersArray[i+skip]}" target="_blank">idurl.id/${parametersArray[i+skip]}</a>` + '</td>';
      row.innerHTML += '<td class="text-center">' +
      `<button class="btn btn-sm btn-danger" onclick="deleteRow(this, '${parametersArray[i+skip]}')" type="button" data-bs-toggle="tooltip" data-bs-placement="top" title="Hapus">
          <i class="fas fa-trash"></i>
      </button>` + '</td>';
      tableBody.appendChild(row);// satu element td utuh dimasukkan ke element tableBody
      number++;
    }
  }
  if (parametersArray.length > totalItems) {
    loadPagination(parametersArray, currentPage, totalItems);
  }
}

function loadPagination(dataArray, currentPage, totalItems) {
  var totalPages = Math.ceil(dataArray.length/totalItems);
  var paginationElement = document.getElementById('paginasi');
  paginationElement.innerHTML = `<nav class="d-flex justify-content-center" aria-label="...">
  <ul class="pagination pagination" id="ul-paginasi"></ul></nav>`;
  var paginationUl = document.getElementById('ul-paginasi');
  if (currentPage !== 1) {
    paginationUl.innerHTML = `<li class="page-item">
        <a class="page-link" href="${ currentPage-1 === 1 ? '/' : `/?halaman=${currentPage-1}` }">Previous</a>
    </li>`;
  } else {
    paginationUl.innerHTML = `<li class="page-item disabled">
        <span class="page-link">Previous</span>
    </li>`;
  }
  for (var i=1; i<=totalPages; i++) {
    if (currentPage === i) {
      paginationUl.innerHTML += `<li class="page-item active" aria-current="page">
          <span class="page-link">${i}</span>
      </li>`;
    } else {
      paginationUl.innerHTML += `<li class="page-item">
          <a class="page-link" href="${ i === 1 ? '/' : `/?halaman=${i}` }">${i}</a>
      </li>`;
    }
  }
  if (currentPage !== totalPages) {
    paginationUl.innerHTML += `<li class="page-item">
        <a class="page-link" href="/?halaman=${currentPage+1}">Next</a>
    </li>`;
  } else {
    paginationUl.innerHTML += `<li class="page-item disabled">
        <span class="page-link">Next</span>
    </li>`;
  }
}

function deleteRow(element, oldParameter) {
  var parameters = localStorage.getItem('parameters');// mengambil data dari local storage
  var parametersArray = parameters.split(',');// data-data dari local storage dijadikan array
  var csrf = document.querySelector('[name=_csrf]').value;

  fetch(`/guest-url/${oldParameter}`, {// menghapus dari database
    method: 'DELETE',
    headers: {
      'csrf-token': csrf,
    },
  }).then((result) => result.json())
      .then((data) => {// jika berhasil dihapus dari database
        parametersArray = parametersArray.filter(function(parameter) {// menghilangkan data terkait dari array
          return parameter !== oldParameter;
        });
        localStorage.setItem('parameters', parametersArray.toString());// memperbarui local storage
        element.parentNode.parentNode.remove();// menghapus row terkait di html
        location.replace('/');
      }).catch((error) => {// jika gagal menghapus dari database
        console.log(error);
      });
}
