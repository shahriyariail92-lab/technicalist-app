// ================= توابع عمومی =================
function switchPage(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (btnElement && btnElement.classList.contains('nav-btn')) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
}

// ================= بازار (ارتقا یافته) =================
let globalCryptoData = [];
let sparklineInstances = []; 
let currentFilter = 'all';

function loadMarketData(type, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const container = document.getElementById('market-list');
    const controls = document.getElementById('crypto-controls');
    
    container.innerHTML = '<div class="loading">در حال دریافت...</div>';

    if (type === 'crypto') {
        if(controls) controls.style.display = 'block';
        fetchCryptoList();
    } else {
        if(controls) controls.style.display = 'none';
        fetchFiatData();
    }
}

function fetchCryptoList() {
    // 🆕 دریافت ۲۵۰ ارز برتر به جای ۲۰ ارز (برای جستجوی بهتر مثل Pepe)
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h")
        .then(res => res.json())
        .then(data => {
            globalCryptoData = data;
            const searchVal = document.getElementById('search-input') ? document.getElementById('search-input').value : '';
            renderCryptoList(currentFilter, searchVal);
        })
        .catch(err => {
            document.getElementById('market-list').innerHTML = '<p style="color:#EF4444; text-align:center;">خطا در دریافت اطلاعات بازار.</p>';
        });
}

function renderCryptoList(filter, searchText) {
    const container = document.getElementById('market-list');
    container.innerHTML = '';
    
    sparklineInstances.forEach(inst => inst.destroy());
    sparklineInstances = [];

    let filteredData = globalCryptoData;

    if (searchText) {
        filteredData = filteredData.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()) || c.symbol.toLowerCase().includes(searchText.toLowerCase()));
    }

    if (filter === 'gainers') {
        filteredData = [...filteredData].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    } else if (filter === 'losers') {
        filteredData = [...filteredData].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
    }

    if (filteredData.length === 0) {
        container.innerHTML = '<p style="color:#94A3B8; text-align:center; margin-top:20px;">ارزی یافت نشد.</p>';
        return;
    }

    filteredData.forEach((coin) => {
        const price = coin.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6});
        const change = coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0.00';
        const isPos = change >= 0;
        const volume = (coin.total_volume / 1000000).toFixed(2) + 'M';
        const canvasId = `spark-${coin.id}`;

        container.innerHTML += `
            <div class="crypto-card-new" onclick="openChart('BINANCE:${coin.symbol.toUpperCase()}USDT', '${coin.name}', ${coin.current_price}, '${coin.image}')">
                <div class="card-top">
                    <div class="card-info">
                        <img src="${coin.image}" style="width: 35px; height: 35px;">
                        <div>
                            <div style="font-weight: bold; font-size: 15px;">${coin.name}</div>
                            <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">${coin.symbol} · ${volume} Vol</div>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-weight: bold; font-size: 15px;">$${price}</div>
                        <div style="font-size: 12px; color: ${isPos ? '#10B981' : '#EF4444'}; font-weight: bold;">
                            ${isPos ? '▲' : '▼'} ${Math.abs(change)}%
                        </div>
                    </div>
                </div>
                <div class="card-bottom">
                    <div class="card-stats">
                        <span>High: $${coin.high_24h.toLocaleString()}</span>
                        <span>Low: $${coin.low_24h.toLocaleString()}</span>
                    </div>
                    <div class="sparkline-container">
                        <canvas id="${canvasId}"></canvas>
                    </div>
                </div>
            </div>
        `;
    });

    setTimeout(() => {
        filteredData.forEach(coin => {
            const canvasId = `spark-${coin.id}`;
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            
            const prices = coin.sparkline_in_7d.price;
            const isPos = prices[0] <= prices[prices.length - 1];

            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: prices.map((_, i) => i),
                    datasets: [{
                        data: prices,
                        borderColor: isPos ? '#10B981' : '#EF4444',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
            sparklineInstances.push(chart);
        });
    }, 50);
}

function filterCryptoList() {
    const searchText = document.getElementById('search-input').value;
    renderCryptoList(currentFilter, searchText);
}

function sortCryptoList(filterType, btn) {
    currentFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const searchVal = document.getElementById('search-input') ? document.getElementById('search-input').value : '';
    renderCryptoList(currentFilter, searchVal);
}

function fetchFiatData() {
    const container = document.getElementById('market-list');
    container.innerHTML = '<div class="loading">در حال دریافت قیمت‌های واقعی...</div>';

    const dataUrl = 'https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/popular.json';

    fetch(dataUrl)
        .then(res => res.json())
        .then(payload => {
            const items = payload.data || [];
            const usdItem = items.find(item => item.symbol === 'USD_IRR_FREE'); 
            const gold18Item = items.find(item => item.symbol === 'GOLD_18K_IRR'); 
            const gold24Item = items.find(item => item.symbol === 'GOLD_24K_IRR'); 

            container.innerHTML = '';
            const formatPrice = (num) => num ? Number(num).toLocaleString('fa-IR') : '--';

            if (usdItem) {
                container.innerHTML += `
                    <div class="crypto-row">
                        <div class="crypto-info">
                            <span style="font-size:24px; margin-left:10px;">💵</span>
                            <div><div class="crypto-name">دلار آزاد</div><div class="crypto-symbol">USD</div></div>
                        </div>
                        <div class="crypto-price"><div>${formatPrice(usdItem.price)} تومان</div></div>
                    </div>`;
            }

            const goldData = [
                { item: gold18Item, name: 'طلا ۱۸ عیار', symbol: 'GOLD18', icon: '🪙' },
                { item: gold24Item, name: 'طلا ۲۴ عیار', symbol: 'GOLD24', icon: '🥇' }
            ];

            goldData.forEach(g => {
                if (g.item) {
                    container.innerHTML += `
                        <div class="crypto-row">
                            <div class="crypto-info">
                                <span style="font-size:24px; margin-left:10px;">${g.icon}</span>
                                <div><div class="crypto-name">${g.name}</div><div class="crypto-symbol">${g.symbol}</div></div>
                            </div>
                            <div class="crypto-price"><div>${formatPrice(g.item.price)} تومان</div></div>
                        </div>`;
                }
            });
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<p style="color:#EF4444; text-align:center;">خطا در دریافت قیمت‌ها. لطفاً VPN را بررسی کنید.</p>';
        });
}

// 🆕 باز کردن چارت با اصلاح باگ استیبل‌کوین‌ها (تتر)
function openChart(symbol, coinName, price, image) {
    let finalSymbol = symbol;
    
    // اگر ارز تتر یا استیبل کوین بود، به جای ارور دادن، چارت بیت‌کوین را نشان بده
    if (symbol === "BINANCE:USDTUSDT" || symbol === "BINANCE:USDCUSDT") {
        finalSymbol = "BINANCE:BTCUSDT"; 
    }

    document.getElementById('tv-chart').src = `https://s.tradingview.com/widgetembed/?symbol=${finalSymbol}&interval=60&theme=dark&style=1&locale=fa_IR&hide_side_toolbar=0&allow_symbol_change=1&studies=RSI@tv-basicstudies`;
    
    // آپدیت هدر چارت
    document.getElementById('chart-coin-name').innerHTML = `<img src="${image}" style="width:20px; height:20px; vertical-align:middle; margin-left:5px;"> ${coinName}`;
    document.getElementById('chart-coin-price').innerText = `$${price.toLocaleString()}`;
    
    switchPage('chart-page', document.querySelector('.nav-btn:nth-child(3)'));
}

// ================= هوش مصنوعی =================
function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function(){
        document.getElementById('image-preview').src = reader.result;
        document.getElementById('image-preview-container').style.display = 'block';
        document.getElementById('ai-result').style.display = 'none';
    };
    reader.readAsDataURL(event.target.files[0]);
}

function analyzeChart() {
    const btn = document.getElementById('analyze-btn');
    const resultDiv = document.getElementById('ai-result');
    const resultText = document.getElementById('ai-result-text');
    const fileInput = document.getElementById('chart-upload');

    if (!fileInput.files[0]) {
        alert("لطفاً ابتدا یک عکس از چارت انتخاب کنید.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> هوش مصنوعی در حال تحلیل است...';
    btn.disabled = true;
    resultDiv.style.display = 'none';

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    const API_URL = "https://nobitex-bot-5fs4.onrender.com"; 

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
    })
    .then(async res => {
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "خطای ناشناخته در سرور");
        return data;
    })
    .then(data => {
        btn.innerHTML = 'ارسال برای تحلیل';
        btn.disabled = false;
        resultDiv.style.display = 'block';
        resultText.innerHTML = data.analysis.replace(/\n/g, '<br>');
    })
    .catch(err => {
        clearTimeout(timeoutId);
        btn.innerHTML = 'ارسال برای تحلیل';
        btn.disabled = false;
        if (err.name === 'AbortError') alert("درخواست طولانی شد. لطفاً اینترنت را بررسی کنید.");
        else alert("خطا: " + err.message);
    });
}

// ================= روان‌شناسی و Chart =================
let emotionChartInstance = null;
function getEmotions() { return JSON.parse(localStorage.getItem('myEmotions') || '[]'); }

function logEmotion(emotionName) {
    const emotions = getEmotions();
    emotions.unshift({ emotion: emotionName, date: new Date().toLocaleString('fa-IR') });
    localStorage.setItem('myEmotions', JSON.stringify(emotions));
    renderEmotions();
    alert(`احساس "${emotionName}" ثبت شد.`);
}

function renderEmotions() {
    const emotions = getEmotions();
    const container = document.getElementById('emotion-history');
    
    if (!emotions.length) {
        container.innerHTML = '<p style="color:#94A3B8; text-align:center;">هنوز احساسی ثبت نکرده‌اید.</p>';
    } else {
        container.innerHTML = emotions.slice(0, 5).map(e => `
            <div class="emotion-log-item">
                <span>${e.emotion}</span>
                <span style="color:#94A3B8; font-size:11px;">${e.date}</span>
            </div>
        `).join('');
    }

    const counts = {};
    emotions.forEach(e => counts[e.emotion] = (counts[e.emotion] || 0) + 1);
    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (emotionChartInstance) emotionChartInstance.destroy();

    const ctx = document.getElementById('emotionChart').getContext('2d');
    emotionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['داده‌ای نیست'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: ['#EF4444', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#64748B'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom', labels: { color: '#CBD5E1', font: { family: 'Tahoma' } } } },
            cutout: '70%'
        }
    });
}

// ================= ژورنال و Chart =================
let winRateChartInstance = null;
function getTrades() { return JSON.parse(localStorage.getItem('myTrades') || '[]'); }

function addTrade() {
    const coin = document.getElementById('coin-name').value.toUpperCase();
    const type = document.getElementById('trade-type').value;
    const amount = document.getElementById('trade-amount').value;
    const pnl = document.getElementById('trade-pnl').value;

    if (!coin || !amount) return alert('لطفاً نام ارز و مبلغ را وارد کنید!');
    
    const trades = getTrades();
    trades.unshift({ id: Date.now(), coin, type, amount, pnl: pnl ? parseFloat(pnl) : null, date: new Date().toLocaleDateString('fa-IR') });
    
    localStorage.setItem('myTrades', JSON.stringify(trades));
    document.getElementById('coin-name').value = '';
    document.getElementById('trade-amount').value = '';
    document.getElementById('trade-pnl').value = '';
    renderTrades();
}

function renderTrades() {
    const trades = getTrades();
    const list = document.getElementById('trades-list');
    
    if (!trades.length) {
        list.innerHTML = '<p style="color:#94A3B8; text-align:center;">معامله‌ای ثبت نشده.</p>';
    } else {
        list.innerHTML = trades.map(t => {
            let pnlText = '';
            if (t.pnl !== null && t.pnl !== undefined) {
                const isProfit = t.pnl >= 0;
                pnlText = `<div style="color: ${isProfit ? '#10B981' : '#EF4444'}; font-size:12px;">${isProfit ? '+' : ''}$${t.pnl}</div>`;
            }
            return `
            <div class="glass-card" style="display:flex; justify-content:space-between; border-right: 3px solid ${t.type==='long'?'#10B981':'#EF4444'}; margin-bottom:8px; padding:10px;">
                <div>
                    <div style="font-weight:bold; font-size:13px;">${t.coin} (${t.type==='long'?'خرید':'فروش'})</div>
                    <div style="font-size:10px; color:#94A3B8;">${t.date}</div>
                </div>
                <div style="text-align:left;">
                    <div style="color:#CBD5E1; font-weight:bold; font-size:12px;">$${t.amount}</div>
                    ${pnlText}
                </div>
            </div>`;
        }).join('');
    }

    const tradesWithPnl = trades.filter(t => t.pnl !== null && t.pnl !== undefined);
    const winTrades = tradesWithPnl.filter(t => t.pnl > 0).length;
    const loseTrades = tradesWithPnl.filter(t => t.pnl <= 0).length;

    if (winRateChartInstance) winRateChartInstance.destroy();

    const ctx = document.getElementById('winRateChart').getContext('2d');
    winRateChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['سود (Win)', 'ضرر (Loss)'],
            datasets: [{
                data: [winTrades, loseTrades],
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom', labels: { color: '#CBD5E1', font: { family: 'Tahoma' } } } },
            cutout: '70%'
        }
    });
}

// ================= بخش ربات (اتصال به سرور ابری) =================
const API_URL = "https://nobitex-bot-5fs4.onrender.com"; 

function toggleRobot() {
    const toggle = document.getElementById('robot-toggle');
    const badge = document.getElementById('robot-status-badge');
    
    badge.innerText = 'در حال ارسال دستور...';
    badge.className = 'badge offline';

    fetch(`${API_URL}/toggle`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.is_active) {
                badge.className = 'badge online';
                badge.innerText = 'فعال (متصل به سرور)';
            } else {
                badge.className = 'badge offline';
                badge.innerText = 'خاموش';
            }
        })
        .catch(err => {
            alert("خطا در اتصال! لطفاً VPN را روشن کرده، ۵۰ ثانیه صبر کنید و دوباره تلاش کنید.");
            toggle.checked = false;
            badge.className = 'badge offline';
            badge.innerText = 'قطع ارتباط';
        });
}

function fetchRobotLogs() {
    fetch(`${API_URL}/status`)
        .then(res => res.json())
        .then(data => {
            const toggle = document.getElementById('robot-toggle');
            const badge = document.getElementById('robot-status-badge');
            const positionPanel = document.getElementById('position-panel');
            const symbolSelect = document.getElementById('robot-symbol');
            
            if(data.is_active !== toggle.checked) {
                toggle.checked = data.is_active;
                badge.className = data.is_active ? 'badge online' : 'badge offline';
                badge.innerText = data.is_active ? 'فعال (متصل به سرور)' : 'خاموش';
            }

            if (data.active_symbol && symbolSelect.value !== data.active_symbol) {
                symbolSelect.value = data.active_symbol;
            }

            if (data.in_position) {
                positionPanel.style.display = 'block';
                document.getElementById('pos-type').innerText = data.position_type === 'long' ? 'خرید (LONG)' : 'فروش (SHORT)';
                document.getElementById('pos-type').style.color = data.position_type === 'long' ? '#10B981' : '#EF4444';
                document.getElementById('pos-entry').innerText = `$${data.entry_price.toLocaleString()}`;
                document.getElementById('pos-sl').innerText = `$${data.stop_loss.toLocaleString()}`;
                document.getElementById('pos-tp').innerText = `$${data.take_profit.toLocaleString()}`;
            } else {
                positionPanel.style.display = 'none';
            }

            const logsContainer = document.getElementById('robot-logs');
            if(data.logs && data.logs.length > 0) {
                logsContainer.innerHTML = data.logs.map(log => `<div>${log}</div>`).join('');
            }
        })
        .catch(err => console.log("سرور آفلاین است"));
}

function changeActiveSymbol() {
    const symbol = document.getElementById('robot-symbol').value;
    fetch(`${API_URL}/set_symbol`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert(`ارز فعال به ${symbol} تغییر کرد.`);
            fetchRobotLogs();
        } else {
            alert("خطا: " + data.message);
            fetchRobotLogs();
        }
    })
    .catch(err => alert("خطا در ارتباط با سرور!"));
}

function closePositionManually() {
    if (!confirm("آیا مطمئن هستید که می‌خواهید پوزیشن را به صورت دستی ببندید؟")) return;
    fetch(`${API_URL}/close_position`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') alert("پوزیشن با موفقیت بسته شد.");
            else alert("خطا: " + data.message);
        })
        .catch(err => alert("خطا در ارتباط با سرور!"));
}

// ================= اجرای اولیه =================
document.addEventListener("DOMContentLoaded", () => {
    fetchCryptoList();
    renderTrades();
    renderEmotions();
    setInterval(fetchRobotLogs, 3000);
});
