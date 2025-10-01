/**
 * 德州撲克籌碼結算計算器
 * 主要功能類別 - 修正版本
 */
class PokerSettlementCalculator {
    constructor() {
        this.players = [];
        this.exchangeRate = 0.5; // 預設: 1 籌碼 = 0.5 現金
        this.chipAmountPerSet = 1000; // 每組籌碼數量
        this.cashAmountPerSet = 500; // 每組現金價格
        this.playerIdCounter = 0;
        this.init();
    }

    /**
     * 初始化應用程式
     */
    init() {
        this.bindEvents();
        this.updateExchangeRate();
        this.addInitialPlayers();
    }

    /**
     * 綁定事件監聽器
     */
    bindEvents() {
        // 兌換比例輸入
        document.getElementById('chipAmount').addEventListener('input', () => this.updateExchangeRate());
        document.getElementById('cashAmount').addEventListener('input', () => this.updateExchangeRate());
        
        // 玩家管理
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.addPlayer());
        document.getElementById('showImportModalBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('closeImportModalBtn').addEventListener('click', () => this.hideImportModal());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importData());
        
        // 平衡調整
        document.getElementById('adjustBalanceBtn').addEventListener('click', () => this.adjustBalance());
        document.getElementById('reenterDataBtn').addEventListener('click', () => this.reenterData());
        
        // 計算按鈕
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculateSettlement());
        document.getElementById('finalCalculateBtn').addEventListener('click', () => this.recalculate());
        document.getElementById('copyExportBtn').addEventListener('click', () => this.copyExportText());
        
        // 選項卡切換
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
                if (e.target.dataset.tab === 'export') {
                    this.generateExportText();
                }
            });
        });
    }

    /**
     * 更新兌換比例
     */
    updateExchangeRate() {
        const chipAmount = parseFloat(document.getElementById('chipAmount').value) || 1000;
        const cashAmount = parseFloat(document.getElementById('cashAmount').value) || 500;
        
        this.chipAmountPerSet = chipAmount; // 每組籌碼數量
        this.cashAmountPerSet = cashAmount; // 每組現金價格
        this.exchangeRate = cashAmount / chipAmount; // 兌換比例：1籌碼值多少現金
        
        document.getElementById('exchangeRate').textContent = 
            `1 籌碼 = ${this.exchangeRate.toFixed(4)} 現金`;
        
        this.updateAllCalculations();
    }

    /**
     * 添加初始示例玩家
     */
    addInitialPlayers() {
        // 按照用户的例子：買1組，剩餘1000籌碼，損益應為0
        this.addPlayer('示例玩家', 1, 1000);
    }

    /**
     * 添加玩家
     */
    addPlayer(name = '', chipsBought = 0, chipsRemaining = 0) {
        const playerId = this.playerIdCounter++;
        const player = {
            id: playerId,
            name: name,
            chipsBought: chipsBought,
            chipsRemaining: chipsRemaining
        };
        
        this.players.push(player);
        this.renderPlayer(player);
        this.updateAllCalculations();
    }

    /**
     * 渲染玩家行
     */
    renderPlayer(player) {
        const container = document.getElementById('playersContainer');
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-row';
        playerDiv.dataset.playerId = player.id;
        
        playerDiv.innerHTML = `
            <div class="player-inputs">
                <div class="input-group">
                    <label class="form-label">玩家姓名</label>
                    <input type="text" class="form-control player-name" value="${player.name}" 
                           placeholder="輸入姓名" oninput="calculator.updatePlayer(${player.id}, 'name', this.value)">
                </div>
                <div class="input-group">
                    <label class="form-label">購買籌碼組數</label>
                    <input type="number" class="form-control player-bought" value="${player.chipsBought}" 
                           min="0" step="1" placeholder="0" 
                           oninput="calculator.updatePlayer(${player.id}, 'chipsBought', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label class="form-label">剩餘籌碼</label>
                    <input type="number" class="form-control player-remaining" value="${player.chipsRemaining}" 
                           min="0" step="100" placeholder="0"
                           oninput="calculator.updatePlayer(${player.id}, 'chipsRemaining', parseFloat(this.value) || 0)">
                </div>
            </div>
            <div class="player-stats">
                <div class="stat-item">成本: $<span class="stat-value" id="cost-${player.id}">0</span></div>
                <div class="stat-item">剩餘價值: $<span class="stat-value" id="value-${player.id}">0</span></div>
                <div class="stat-item">損益: $<span class="stat-value" id="profit-${player.id}">0</span></div>
                <button class="btn btn-error btn-small" onclick="calculator.removePlayer(${player.id})">
                    🗑️ 刪除
                </button>
            </div>
        `;
        
        container.appendChild(playerDiv);
    }

    /**
     * 更新玩家資料
     */
    updatePlayer(playerId, field, value) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player[field] = value;
            this.updatePlayerStats(playerId);
            this.updateBalanceStatus();
        }
    }

    /**
     * 移除玩家
     */
    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            playerElement.remove();
        }
        this.updateBalanceStatus();
        this.updateAdjustmentPlayerOptions();
    }

    /**
     * 更新玩家統計資料 - 修正計算邏輯
     */
    updatePlayerStats(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // 正確的計算邏輯：
        // 1. 成本 = 購買組數 × 每組現金價格
        // 2. 剩餘價值 = 剩餘籌碼 × 兌換比例（每籌碼值多少現金）
        // 3. 損益 = 剩餘價值 - 成本

        const cost = player.chipsBought * this.cashAmountPerSet; // 成本（現金）
        const remainingValue = player.chipsRemaining * this.exchangeRate; // 剩餘價值（現金）
        const profitLoss = remainingValue - cost; // 損益（現金）

        // 更新顯示
        document.getElementById(`cost-${playerId}`).textContent = cost.toFixed(0);
        document.getElementById(`value-${playerId}`).textContent = remainingValue.toFixed(0);
        
        const profitElement = document.getElementById(`profit-${playerId}`);
        profitElement.textContent = (profitLoss >= 0 ? '+' : '') + profitLoss.toFixed(0);
        profitElement.className = `stat-value ${profitLoss >= 0 ? 'profit-positive' : 'profit-negative'}`;
    }

    /**
     * 更新所有計算
     */
    updateAllCalculations() {
        this.players.forEach(player => {
            this.updatePlayerStats(player.id);
        });
        this.updateBalanceStatus();
        this.updateAdjustmentPlayerOptions();
    }

    /**
     * 更新平衡狀態
     */
    updateBalanceStatus() {
        let totalBalance = 0;

        // 計算所有玩家的總損益
        this.players.forEach(player => {
            const cost = player.chipsBought * this.cashAmountPerSet;
            const remainingValue = player.chipsRemaining * this.exchangeRate;
            const profitLoss = remainingValue - cost;
            totalBalance += profitLoss;
        });

        const balanceValue = document.getElementById('balanceValue');
        const balanceAmount = document.getElementById('balanceAmount');
        const balanceAdjustment = document.getElementById('balanceAdjustment');

        if (Math.abs(totalBalance) < 0.01) { // 考慮浮點數精度
            balanceValue.textContent = '平衡';
            balanceValue.className = 'balance-value balance-balanced';
            balanceAmount.textContent = '差額: $0';
            balanceAdjustment.style.display = 'none';
        } else {
            balanceValue.textContent = '不平衡';
            balanceValue.className = 'balance-value balance-unbalanced';
            balanceAmount.textContent = `差額: $${totalBalance.toFixed(2)}`;
            balanceAdjustment.style.display = 'block';
        }
    }

    /**
     * 更新調整玩家選項
     */
    updateAdjustmentPlayerOptions() {
        const select = document.getElementById('adjustmentPlayer');
        select.innerHTML = '<option value="">選擇玩家</option>';
        
        this.players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name || `玩家 ${player.id + 1}`;
            select.appendChild(option);
        });
    }

    /**
     * 調整平衡
     */
    adjustBalance() {
        const selectedPlayerId = document.getElementById('adjustmentPlayer').value;
        if (!selectedPlayerId) {
            alert('請選擇要調整的玩家');
            return;
        }

        let totalBalance = 0;

        // 計算總體不平衡金額
        this.players.forEach(player => {
            const cost = player.chipsBought * this.cashAmountPerSet;
            const remainingValue = player.chipsRemaining * this.exchangeRate;
            const profitLoss = remainingValue - cost;
            totalBalance += profitLoss;
        });

        // 調整選中玩家的剩餘籌碼來平衡帳目
        const selectedPlayer = this.players.find(p => p.id == selectedPlayerId);
        if (selectedPlayer) {
            // 需要調整的籌碼數量 = 差額 ÷ 兌換比例
            const adjustment = -totalBalance / this.exchangeRate;
            selectedPlayer.chipsRemaining += adjustment;
            
            // 更新輸入框
            const input = document.querySelector(`[data-player-id="${selectedPlayerId}"] .player-remaining`);
            if (input) {
                input.value = Math.round(selectedPlayer.chipsRemaining);
            }
            
            this.updateAllCalculations();
        }
    }

    /**
     * 重新輸入數據
     */
    reenterData() {
        // 清空所有玩家的籌碼數據
        this.players.forEach(player => {
            player.chipsBought = 0;
            player.chipsRemaining = 0;
            
            const playerElement = document.querySelector(`[data-player-id="${player.id}"]`);
            if (playerElement) {
                playerElement.querySelector('.player-bought').value = 0;
                playerElement.querySelector('.player-remaining').value = 0;
            }
        });
        
        this.updateAllCalculations();
    }

    /**
     * 計算結算
     */
    calculateSettlement() {
        // 檢查是否平衡
        const balanceValue = document.getElementById('balanceValue');
        if (balanceValue.textContent === '不平衡') {
            alert('請先處理帳目不平衡問題');
            return;
        }

        // 準備數據
        const settlements = this.players.map(player => {
            const cost = player.chipsBought * this.cashAmountPerSet;
            const remainingValue = player.chipsRemaining * this.exchangeRate;
            const profitLoss = remainingValue - cost;
            
            return {
                name: player.name || `玩家 ${player.id + 1}`,
                amount: profitLoss
            };
        });

        // 計算轉帳方案
        const transfers = this.calculateTransfers(settlements);
        
        // 顯示結果
        this.displayResults(transfers, settlements);
        document.getElementById('resultsSection').style.display = 'block';
    }

    /**
     * 計算最優轉帳方案
     */
    calculateTransfers(settlements) {
        const transfers = [];
        let debtors = settlements.filter(s => s.amount < -0.01).map(s => ({ ...s }));
        let creditors = settlements.filter(s => s.amount > 0.01).map(s => ({ ...s }));

        // Sort once
        debtors.sort((a, b) => a.amount - b.amount); // Most negative first
        creditors.sort((a, b) => b.amount - a.amount); // Most positive first

        let i = 0; // debtor index
        let j = 0; // creditor index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const transferAmount = Math.min(-debtor.amount, creditor.amount);

            if (transferAmount > 0.01) {
                transfers.push({
                    from: debtor.name,
                    to: creditor.name,
                    amount: transferAmount
                });
            }

            debtor.amount += transferAmount;
            creditor.amount -= transferAmount;

            if (Math.abs(debtor.amount) < 0.01) {
                i++;
            }
            if (Math.abs(creditor.amount) < 0.01) {
                j++;
            }
        }

        return transfers;
    }

    /**
     * 顯示結果
     */
    displayResults(transfers, settlements) {
        // 顯示轉帳方案
        const transfersList = document.getElementById('transfersList');
        if (transfers.length === 0) {
            transfersList.innerHTML = '<p>無需進行轉帳，所有人已平衡。</p>';
        } else {
            transfersList.innerHTML = transfers.map(transfer => `
                <div class="transfer-item">
                    <div class="transfer-details">
                        <strong>${transfer.from}</strong> 需支付給 <strong>${transfer.to}</strong>
                    </div>
                    <div class="transfer-amount">$${transfer.amount.toFixed(2)}</div>
                </div>
            `).join('');
        }

        // 顯示損益報告
        const profitsList = document.getElementById('profitsList');
        profitsList.innerHTML = settlements.map(settlement => `
            <div class="profit-item">
                <div class="profit-name">${settlement.name}</div>
                <div class="profit-amount ${settlement.amount >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${settlement.amount >= 0 ? '+' : ''}$${settlement.amount.toFixed(2)}
                </div>
            </div>
        `).join('');
    }

    /**
     * 切換選項卡
     */
    switchTab(tabName) {
        // 移除所有活躍狀態
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // 激活選中的選項卡
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    /**
     * 重新計算
     */
    recalculate() {
        this.calculateSettlement();
    }

    /**
     * 生成匯出文字
     */
    generateExportText() {
        let exportText = "德州撲克結算\n";
        exportText += "====================\n";
        exportText += `日期: ${new Date().toLocaleDateString()}\n`;
        exportText += `兌換比例: ${this.chipAmountPerSet} 籌碼 = ${this.cashAmountPerSet} 現金\n`;
        exportText += "====================\n\n";

        this.players.forEach(player => {
            const cost = player.chipsBought * this.cashAmountPerSet;
            const remainingValue = player.chipsRemaining * this.exchangeRate;
            const profitLoss = remainingValue - cost;

            exportText += `玩家: ${player.name || `玩家 ${player.id + 1}`}\n`;
            exportText += `  - 購買籌碼組數: ${player.chipsBought}\n`;
            exportText += `  - 剩餘籌碼: ${player.chipsRemaining.toFixed(0)}\n`;
            exportText += `  - 成本: $${cost.toFixed(0)}\n`;
            exportText += `  - 剩餘價值: $${remainingValue.toFixed(0)}\n`;
            exportText += `  - 損益: $${(profitLoss >= 0 ? '+' : '')}${profitLoss.toFixed(0)}\n\n`;
        });

        const settlements = this.players.map(player => {
            const cost = player.chipsBought * this.cashAmountPerSet;
            const remainingValue = player.chipsRemaining * this.exchangeRate;
            const profitLoss = remainingValue - cost;
            return { name: player.name || `玩家 ${player.id + 1}`, amount: profitLoss };
        });

        const transfers = this.calculateTransfers(settlements);
        if (transfers.length > 0) {
            exportText += "轉帳方案:\n";
            transfers.forEach(transfer => {
                exportText += `  - ${transfer.from} 需支付給 ${transfer.to} $${transfer.amount.toFixed(2)}\n`;
            });
        }

        document.getElementById('exportTextArea').value = exportText;
    }

    /**
     * 複製匯出文字
     */
    copyExportText() {
        const textArea = document.getElementById('exportTextArea');
        textArea.select();
        document.execCommand('copy');
        alert('已複製到剪貼簿');
    }

    /**
     * 顯示匯入視窗
     */
    showImportModal() {
        document.getElementById('importModal').style.display = 'block';
    }

    /**
     * 隱藏匯入視窗
     */
    hideImportModal() {
        document.getElementById('importModal').style.display = 'none';
    }

    /**
     * 匯入資料
     */
    importData() {
        const data = document.getElementById('importDataTextArea').value.trim();
        if (!data) {
            alert('請輸入資料');
            return;
        }

        const lines = data.split('\n');
        lines.forEach(line => {
            const parts = line.split(/\s+/);
            if (parts.length === 3) {
                const name = parts[0];
                const chipsBought = parseFloat(parts[1]);
                const chipsRemaining = parseFloat(parts[2]);
                if (!isNaN(chipsBought) && !isNaN(chipsRemaining)) {
                    this.addPlayer(name, chipsBought, chipsRemaining);
                }
            }
        });

        this.hideImportModal();
    }
}

// 創建全局實例
let calculator;

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    calculator = new PokerSettlementCalculator();
});

// 全局函數供 HTML 使用
window.calculator = calculator;