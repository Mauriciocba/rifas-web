// 🔥 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// 🔧 Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBsPU7G_-63EdUZi9Xs6oFioFXtmFWLuRI",
  authDomain: "rifaweb-15822.firebaseapp.com",
  projectId: "rifaweb-15822",
  storageBucket: "rifaweb-15822.appspot.com",
  messagingSenderId: "789582016637",
  appId: "1:789582016637:web:374e857c1fa44fe5d7c114"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 💾 Datos
let rifaData = {};
let selectedNumber = null;
const PRICE_PER_NUMBER = 3000;

// 🔁 Escuchar cambios en tiempo real desde Firebase
function escucharCambios() {
  const ref = collection(db, "rifa");
  onSnapshot(ref, (snapshot) => {
    const nuevosDatos = {};
    snapshot.forEach(docSnap => {
      nuevosDatos[parseInt(docSnap.id)] = docSnap.data();
    });
    rifaData = nuevosDatos;
    createGrid();
    updateStats();
  });
}

// 🧱 Crear grilla de números
function createGrid() {
  const grid = document.getElementById('numbers-grid');
  grid.innerHTML = '';

  for (let i = 0; i <= 99; i++) {
    const cell = document.createElement('div');
    cell.className = 'number-cell';
    cell.textContent = i.toString().padStart(2, '0');
    cell.onclick = () => selectNumber(i);

    if (rifaData[i]) {
      cell.classList.add('sold');
      const ownerInfo = document.createElement('div');
      ownerInfo.className = 'owner-info';
      ownerInfo.textContent = `${rifaData[i].name} ${rifaData[i].lastname}`;
      cell.appendChild(ownerInfo);
    } else if (selectedNumber === i) {
      cell.classList.add('selected');
    }

    grid.appendChild(cell);
  }
}

// 🎯 Seleccionar número
function selectNumber(number) {
  if (rifaData[number]) {
    showAlert(`El número ${number.toString().padStart(2, '0')} ya está vendido a ${rifaData[number].name} ${rifaData[number].lastname}`, 'error');
    return;
  }

  selectedNumber = number;
  document.getElementById('number-input').value = number;
  createGrid(); // Refrescar selección
}

// 💸 Vender número
async function sellNumber() {
  const numberInput = document.getElementById('number-input');
  const nameInput = document.getElementById('name-input');
  const lastnameInput = document.getElementById('lastname-input');

  const number = parseInt(numberInput.value);
  const name = nameInput.value.trim();
  const lastname = lastnameInput.value.trim();

  if (isNaN(number) || number < 0 || number > 99) {
    showAlert('Por favor, ingresa un número válido entre 0 y 99', 'error');
    return;
  }

  if (!name || !lastname) {
    showAlert('Por favor, ingresa nombre y apellido', 'error');
    return;
  }

  if (rifaData[number]) {
    showAlert(`El número ${number.toString().padStart(2, '0')} ya está vendido`, 'error');
    return;
  }

  await setDoc(doc(db, "rifa", number.toString()), {
    name,
    lastname,
    date: new Date().toISOString()
  });

  numberInput.value = '';
  nameInput.value = '';
  lastnameInput.value = '';
  selectedNumber = null;

  showAlert(`¡Número ${number.toString().padStart(2, '0')} vendido exitosamente a ${name} ${lastname}!`, 'success');
}

// 📊 Actualizar estadísticas
function updateStats() {
  const soldCount = Object.keys(rifaData).length;
  const availableCount = 100 - soldCount;
  const totalAmount = soldCount * PRICE_PER_NUMBER;

  document.getElementById('sold-count').textContent = soldCount;
  document.getElementById('available-count').textContent = availableCount;
  document.getElementById('total-amount').textContent = `$${totalAmount.toLocaleString('es-AR')}`;
}

// ⚠️ Mostrar alertas
function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.classList.remove('hidden');
  setTimeout(() => {
    alert.classList.add('hidden');
  }, 5000);
}

// 🧹 Reiniciar rifa (borrar Firebase)
async function resetRifa() {
  if (confirm('¿Estás seguro de que quieres reiniciar la rifa? Se perderán todos los datos.')) {
    const querySnapshot = await getDocs(collection(db, "rifa"));
    const deletePromises = [];
    querySnapshot.forEach(docSnap => {
      deletePromises.push(deleteDoc(doc(db, "rifa", docSnap.id)));
    });
    await Promise.all(deletePromises);
    rifaData = {};
    selectedNumber = null;
    createGrid();
    updateStats();
    showAlert('Rifa reiniciada exitosamente', 'success');
  }
}

// 💾 Exportar TXT
function exportDataTXT() {
  const data = {
    rifaData,
    stats: {
      soldCount: Object.keys(rifaData).length,
      availableCount: 100 - Object.keys(rifaData).length,
      totalAmount: Object.keys(rifaData).length * PRICE_PER_NUMBER
    },
    exportDate: new Date().toISOString()
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rifa_data_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// 📄 Exportar PDF
async function exportDataAsPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  doc.setFontSize(14);
  doc.text('Datos de la Rifa', 10, y);
  y += 10;
  doc.setFontSize(11);

  for (const [num, info] of Object.entries(rifaData)) {
    const line = `Número: ${num.padStart(2, '0')} - ${info.name} ${info.lastname} - Fecha: ${new Date(info.date).toLocaleString()}`;
    doc.text(line, 10, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  }

  y += 10;
  doc.setFontSize(12);
  doc.text('Estadísticas:', 10, y); y += 7;

  const soldCount = Object.keys(rifaData).length;
  const availableCount = 100 - soldCount;
  const totalAmount = soldCount * PRICE_PER_NUMBER;

  doc.text(`Números vendidos: ${soldCount}`, 10, y); y += 7;
  doc.text(`Números disponibles: ${availableCount}`, 10, y); y += 7;
  doc.text(`Total recaudado: $${totalAmount.toLocaleString('es-AR')}`, 10, y); y += 7;
  doc.text(`Exportado el: ${new Date().toLocaleString()}`, 10, y);

  doc.save(`rifa_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ⌨️ Enter para vender
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sellNumber();
    });
  });
});

// ▶️ Iniciar app
function init() {
  escucharCambios(); // Solo escuchamos Firestore
}

init();


window.sellNumber = sellNumber;
window.resetRifa = resetRifa;
window.exportDataTXT = exportDataTXT;
window.exportDataAsPdf = exportDataAsPdf;

