# Champion Betting Game

這是一份可以下注世足冠軍是哪一隊的遊戲，能夠下注冠軍是主場球隊 or 客場球隊。

這份 project 希望做到：

1. 只有莊家(合約部署者)可以 啟動/分錢/抽成/設定起始時間/關閉/把錢轉走 遊戲
2. 只有 EOA 可以加入成為玩家
3. 玩家可以自由下注 Home or Away 會贏，一注固定 0.001 eth
4. 莊家從總池中抽成 1% 歸，剩餘 99% 按照贏家投注比例分配
5. 利用莊家設定結果和分錢這兩件事情分開來的方式，來避免 FlashLoan 攻擊
6. 莊家最後把錢轉走到其他 EOA，不要留在合約中
7. 有意外發生(冠軍賽意外沒開賽)，莊家有權利取消賭盤

測試網測試過程記錄在 worklog.md 中

```shell
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
