const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const dateInput = document.getElementById('date');
const budgetPercent = document.getElementById('budget-percentage');
const progressFill = document.getElementById('progress-fill');

// Set tanggal default ke hari ini
dateInput.valueAsDate = new Date();

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let myChart = null;

// Map Icon Kategori
const categoryIcons = {
    food: '🍔', transport: '🚗', salary: '💰',
    shopping: '🛍️', bills: '💡', other: '✨'
};

function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        alert('Mohon lengkapi data');
        return;
    }

    // Cek jenis transaksi (Pemasukan / Pengeluaran) dari Radio Button
    const type = document.querySelector('input[name="type"]:checked').value;
    let amountValue = +amount.value;

    // Jika tipe pengeluaran, pastikan angka negatif
    if (type === 'expense') {
        amountValue = -Math.abs(amountValue);
    } else {
        amountValue = Math.abs(amountValue);
    }

    const transaction = {
        id: generateID(),
        text: text.value,
        amount: amountValue,
        category: category.value,
        date: dateInput.value
    };

    transactions.push(transaction);
    updateLocalStorage();
    init(); // Refresh semua

    text.value = '';
    amount.value = '';
}

function generateID() { return Math.floor(Math.random() * 100000000); }

function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('li');
    const amountClass = transaction.amount < 0 ? 'minus' : 'plus';
    const colorClass = transaction.amount < 0 ? '#d63031' : '#00b894';

    item.innerHTML = `
        <div class="item-info">
            <div class="cat-icon">${categoryIcons[transaction.category] || '✨'}</div>
            <div class="details">
                <h4>${transaction.text}</h4>
                <small>${transaction.date}</small>
            </div>
        </div>
        <div style="text-align: right;">
            <span style="color:${colorClass}; font-weight:bold;">${sign}${formatRupiah(Math.abs(transaction.amount))}</span>
        </div>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})"><i class="fas fa-trash"></i></button>
    `;

    list.appendChild(item);
}

function updateValues() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1);

    balance.innerText = formatRupiah(total);
    money_plus.innerText = formatRupiah(income);
    money_minus.innerText = formatRupiah(expense);

    // Update Budget Bar (Pengeluaran / Pemasukan * 100)
    let percent = 0;
    if(income > 0) percent = (expense / income) * 100;
    
    // Batasi max 100% untuk visual
    const visualPercent = percent > 100 ? 100 : percent;
    
    budgetPercent.innerText = percent.toFixed(1) + '%';
    progressFill.style.width = visualPercent + '%';
    
    // Ubah warna bar jika boros (>80%)
    if(percent > 80) progressFill.style.background = '#d63031';
    else progressFill.style.background = '#00b894';

    updateChart(transactions);
}

function removeTransaction(id) {
    if(confirm('Hapus transaksi ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateLocalStorage();
        init();
    }
}

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// Fitur Filter
function filterList(type) {
    list.innerHTML = '';
    // Update tombol aktif style
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    let filtered = transactions;
    if (type === 'income') filtered = transactions.filter(t => t.amount > 0);
    if (type === 'expense') filtered = transactions.filter(t => t.amount < 0);

    // Sort by date (terbaru di atas)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    filtered.forEach(addTransactionDOM);
}

// Fitur Export ke CSV
function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Tanggal,Keterangan,Kategori,Jumlah\n"; // Header

    transactions.forEach(t => {
        csvContent += `${t.id},${t.date},${t.text},${t.category},${t.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "laporan_keuangan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Update Chart (Pemasukan vs Pengeluaran)
function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Hitung Total Pemasukan dan Pengeluaran
    const totalIncome = data
        .filter(t => t.amount > 0)
        .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = data
        .filter(t => t.amount < 0)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0); // Ambil nilai positifnya

    // Siapkan data grafik
    let chartData = [totalIncome, totalExpense];
    let chartColors = ['#00b894', '#d63031']; // Hijau (Masuk), Merah (Keluar)

    // Jika data kosong, tampilkan placeholder abu-abu
    if (totalIncome === 0 && totalExpense === 0) {
        chartData = [1];
        chartColors = ['#dfe6e9'];
    }

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'], // Label Sederhana
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%', // Lubang tengah donat
            plugins: {
                legend: {
                    position: 'bottom', // Legend pindah ke bawah agar rapi di HP
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                    }
                },
                tooltip: {
                    // Format Tooltip jadi Rupiah
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null && (totalIncome !== 0 || totalExpense !== 0)) {
                                label += formatRupiah(context.parsed);
                            }
                            return label;
                        }
                    },
                    enabled: (totalIncome !== 0 || totalExpense !== 0) // Hide tooltip jika data kosong
                }
            }
        }
    });
}

function init() {
    list.innerHTML = '';
    // Default: urutkan tanggal terbaru
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(addTransactionDOM);
    updateValues();
}

init();
form.addEventListener('submit', addTransaction);