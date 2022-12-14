# 工程筆記

用幾種路線來思考 code 的進度，不然很容易寫到一半迷失方向

## 莊家

1. 開啟每年度的彩池，設定開始、結束時間、輸入 champion 的時間。
2. 以上三個時間點要是 ascending order。
3. (必須在結束時間之後)真實比賽結束，輸入 champion 結果。觸發計算獎金。
4. 莊家取走抽成。

## 玩家

1. 下 1 注，壓 home win
2. 可以查詢下注狀況
3. 在 Bet complete 之後，可以查詢贏或輸
4. 贏家可以領錢
5. 輸家不可領錢

### Test Scenarios

0. 1 bet 0.001 ether
1. 五家下注。home _ 2, away _ 3。
2. A home 10 bets
3. B away 10 bets
4. C home 100 bets
5. D away 100 bets
6. E home 1000 bets
7. commission rate 1%
8. total 1220 bets, total 1.22 ether
9. commission = 12.2 bets = 0.0122 ether (scaled: 1.22E16)
10. winner = away, winningBets = 110 bets, loseBets = 1110 bets
11.

```
potSizeAfterCommission = totalBetsCount * betPrice - commission
                       = 1220 * (0.001 * 10^18) - (0.0122 * 10^18)
                       = 1.2078e+18

pricePerWinningBet = potSizeAfterCommission / winningBetsCount
                   = 1.2078e18 / 110
                   = 1.098e16
                   -> 1 bet 0.01098 ether
                      原本 1 bet 0.001 ether 可賺回 0.01098
                      賠率 10.98
```

## 莊家處理意外狀況

1. 意外沒開賽，在輸入 champion 之前可以 cancel Bet
2. \_cancel() 處理退款

#### terms

Ticket 每名玩家每次 mint 一張 ticket，一張 ticket 可以包含多個 bets
1 bet 固定為 0.001 ether

#### 開發問題

到底應該下注時就抽成，還是開獎時再抽成呢？
應該下注時就抽成，抽完成再紀錄 bets count

想寫成只收贏家的 1% 錢，贏越多抽越多。
那就得要開獎的時候才能抽成了

Hardhat Test returns transaction instead of return value
in my case,

```
ticketId = contract.connect(playerA).mintLotteryTicket(home, { value: ethers.utils.parseEther("0.001") })
```

ticketId will be a transaction, not an uint256
用 callStatic 來模擬 return value

#### 測試網測試流程

部署合約
使用以下參數
startTime: (1670947200) 12/14 00:00:00 GMT
endTime: (1671006600) 12/14 09:30:00 GMT (16:30 GMT+8)
finalTime: (1671006660) 12/14 09:31:00 GMT (16:31 GMT+8)

deployer/dealer/owner: 0x8FBF8c717fD49714d864F81D26A2348E85a833dd
player A: 0x0b1e8EF6B01BC7Ed9abdf8b9Bd0612D49Fa1D656
player B: 0x0F534257AF0A5a331DF1441297c176060CF09236

contract addr: 0x2d6A1409915F2D4d5cb00A61693a2dEd0bb4357D

deploy and verify，在 etherscan 上和合約互動
deploy 完就應該要可以下注，下注兩筆，分別為
A away(1) 0.001
https://goerli.etherscan.io/tx/0xf9207fd657ee2b8f9e73fd5bf21dc09de3525651e91945d4d24fa60b1c78e170

B home(0) 0.001
https://goerli.etherscan.io/tx/0xa140268fe504eabfac7a86a199ffe55aa2c60dc43d575a7057782d64698a8ad8

以上在 allTickets homeTicket awayTicket 都有成功設立
去運動，等待四點半後，莊家呼叫

1. settleLottery(0)
   https://goerli.etherscan.io/tx/0xece3fa5b682f40ce9a9aa43ccaf7f8d3d11082570b6b1b8755a1e080991ab000
   ![settle 後 commission 有變化](https://i.imgur.com/IBI4IOX.png)
2. triggerWithdrawal(0x8FBF8c717fD49714d864F81D26A2348E85a833dd)
   來觸發分錢，應該要是壓 home 的人拿到錢，莊家會拿到抽成
   https://goerli.etherscan.io/tx/0x92ead757eb1322f15545c754d6ab8b2609ff0430baa67c5d5a97a0d0e3324d01
   ![withdraw success](https://i.imgur.com/H6yS741.png)

#### 意外收穫

原來同樣的合約部署兩次，已經 verify 過的他也認得？真猛
