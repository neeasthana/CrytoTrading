var z = require('zero-fill')
  , n = require('numbro')
  , ema = require('../../../lib/ema')
  , rsi = require('../../../lib/rsi')
  , Phenotypes = require('../../../lib/phenotype')
  , fs = require('fs')

var precisionRound = function(number, precision) {
  var factor = Math.pow(10, precision)
  return Math.round(number * factor) / factor
}

module.exports = {
  name: 'raj',
  description: 'Buy when (MACD - Signal > 0) and sell when (MACD - Signal < 0).',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '1h')
    this.option('period_length', 'period length, same as --period', String, '1h')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 12)
    this.option('ema_long_period', 'number of periods for the longer EMA', Number, 26)
    this.option('signal_period', 'number of periods for the signal EMA', Number, 9)
    this.option('up_trend_threshold', 'threshold to trigger a buy signal', Number, 0)
    this.option('down_trend_threshold', 'threshold to trigger a sold signal', Number, 0)
    this.option('overbought_rsi_periods', 'number of periods for overbought RSI', Number, 25)
    this.option('overbought_rsi', 'sold when RSI exceeds this value', Number, 70),
    this.option('buy_factor', 'buy factor encodes the difference between buy and sell (7 for now)', Number, 4)
    this.option('profit_factor', 'profit per share before selling', Number, .1)
  },

  calculate: function (s) {
    if(s.lookback 
      && s.lookback[0] 
      && s.lookback[0].time ){
      last_time = s.lookback[0].time;
    }
    else{
      last_time = 0;
    }


    buy_total = s.trades.reduce((sum, trade) => {
      if( trade.side === "buy" && trade.time > last_time){
        return sum + trade.size;
      }
      else{
        return sum;
      }
    }, 0);
    sell_total = s.trades.reduce((sum, trade) => {
      if( trade.side === "sell" && trade.time > last_time){
        return sum + trade.size;
      }
      else{
        return sum;
      }
    }, 0);
    //s.trades = []
    s.period["buy_volume"] = precisionRound(buy_total, 12);
    s.period["sell_volume"] = precisionRound(sell_total, 12);
    if(s.trades[s.trades.length - 1]){
      s.period["period_time"] = s.trades[s.trades.length - 1].time;
    }
    else {
      s.period["period_time"] = 0;
    }


    //sell price - encoded as the average of the last few buys
    sell_price = undefined
    sell_quantity = 0

    if (s.my_trades.length > 0){
      pointer = 0
      while((s.my_trades.length - 1 - pointer) >= 0 && s.my_trades[s.my_trades.length - 1 - pointer].type == "buy"){
        last_buy = s.my_trades[s.my_trades.length - 1 - pointer]
        last_buy_price = parseFloat(last_buy.price)
        last_buy_quantity = parseFloat(last_buy.size)

        if(sell_price){
          // console.log(pointer + " - " + sell_price)
          // console.log(pointer + " - " + sell_quantity)
          sell_price = ((sell_price * sell_quantity) + (last_buy_price*last_buy_quantity)) / (sell_quantity + last_buy_quantity)
          sell_quantity = sell_quantity + last_buy_quantity
          // console.log(pointer + " - " + sell_price)
          // console.log(pointer + " - " + sell_quantity)
        }
        else{
          sell_price = ((last_buy_price * last_buy_quantity) + last_buy.fee + s.options.profit_factor) / last_buy_quantity
          sell_quantity = last_buy_quantity
        }
        pointer += 1
      }
    }
    s.period["sell_price"] = sell_price

    //MY CODE END
  },

  onPeriod: function (s, cb) {
    if (!s.in_preroll && typeof s.period.overbought_rsi === 'number') {
      if (s.overbought) {
        s.overbought = false
        s.trend = 'overbought'
        s.signal = 'sell'
        return cb()
      }

    }

    // if (typeof s.period.macd_histogram === 'number' && typeof s.lookback[0].macd_histogram === 'number') {
    //   if ((s.period.macd_histogram - s.options.up_trend_threshold) > 0 && (s.lookback[0].macd_histogram - s.options.up_trend_threshold) <= 0) {
    //     s.signal = 'buy'
    //   } else if ((s.period.macd_histogram + s.options.down_trend_threshold) < 0 && (s.lookback[0].macd_histogram + s.options.down_trend_threshold) >= 0) {
    //     s.signal = 'sell'
    //   } else {
    //     s.signal = null  // hold
    //   }
    // }
    last_trade_type = "blank"
    if(s.my_trades.length > 0){
      last_trade_type = s.my_trades[s.my_trades.length - 1].type
    }

    reasoning = ""

    if (typeof s.period.buy_volume === 'number' && typeof s.period.sell_volume === 'number') {

      // if (s.signal == 'sell' && s.period["sell_price"] && (s.period.buy_volume/s.period.sell_volume) > s.options.buy_factor){
      //   s.signal = null // cancel the trade
      // }
      // else 
      if(s.period["sell_price"] && s.period.close > s.period["sell_price"] && last_trade_type != "sell"){
        s.signal = 'sell'
        s.options.order_type = 'taker'
        reasoning = "20 cent profit"
      }
      else if(s.period["sell_price"] && (s.period.sell_volume/s.period.buy_volume) > s.options.buy_factor && last_trade_type != "sell"){
        s.signal = 'sell'
        s.options.order_type = 'taker'
        reasoning = "ask volume is " + s.options.buy_factor + " times more than the bid volume"
      }
      else if ((s.period.buy_volume/s.period.sell_volume) > s.options.buy_factor && last_trade_type != "buy") {
        s.signal = 'buy'
        s.options.order_type = 'taker'
        reasoning = "bid volume is " + s.options.buy_factor + " times more than the ask volume"
      } 
      else {
        s.signal = null  // hold
      }
    }

    if(s.signal){
      line = "" + s.period.time + "," + s.period.close + "," + s.period.buy_volume + "," + s.period.sell_volume + "," + s.signal + "," + s.options.order_type + "," + s.period.sell_price + "," + reasoning +"\n"
      fs.appendFileSync('log.txt', "" + line)
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    //&& typeof s.lookback[0].buy_volume === 'number'
    if (typeof s.period.buy_volume === 'number' ) {

      var color = 'red'
      // var color = 'grey'
      // if (s.period.buy_volume > s.period.sell_volume) {
      //   color = 'green'
      // }
      // else if (s.period.buy_volume < s.period.sell_volume) {
      //   color = 'red'
      // }
      cols.push(z(8, n(s.period.buy_volume).format('+00.0000'), ' ')[color])
      cols.push(z(8, n(s.period.sell_volume).format('+00.0000'), ' ').cyan)
      
      console.log("\n")
      console.log(s.period)
      console.log(s.options)
      console.log("\ngot here " + s.period.sell_price)
      //console.log(s.period)
      //console.log(s)
    }
    else {
      cols.push('         ')
    }
    return cols
  },

  phenotypes: {
    // -- common
    period_length: Phenotypes.RangePeriod(1, 120, 'm'),
    min_periods: Phenotypes.Range(1, 200),
    markdown_buy_pct: Phenotypes.RangeFloat(-1, 5),
    markup_sell_pct: Phenotypes.RangeFloat(-1, 5),
    order_type: Phenotypes.ListOption(['maker', 'taker']),
    sell_stop_pct: Phenotypes.Range0(1, 50),
    buy_stop_pct: Phenotypes.Range0(1, 50),
    profit_stop_enable_pct: Phenotypes.Range0(1, 20),
    profit_stop_pct: Phenotypes.Range(1,20),

    // -- strategy
    ema_short_period: Phenotypes.Range(1, 20),
    ema_long_period: Phenotypes.Range(20, 100),
    signal_period: Phenotypes.Range(1, 20),
    up_trend_threshold: Phenotypes.Range(0, 50),
    down_trend_threshold: Phenotypes.Range(0, 50),
    overbought_rsi_periods: Phenotypes.Range(1, 50),
    overbought_rsi: Phenotypes.Range(20, 100),
    buy_factor: Phenotypes.Range(1,100),
    profit_factor: Phenotypes.Range(.01,100)
  }
}

