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
9. commission = 12.2 bets (scaled: 1.22E19)
10. winner = away, winningBets = 1100 bets, loseBets = 11100 bets
11. bettingOdds = (11100 \* 10^18 - 1.22E19) / 1100 = 1.0079818e19

B gets 10 \* 1.0079818e19 / 10^18 = 100.79818 bets

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
