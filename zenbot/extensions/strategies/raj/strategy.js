var z = require('zero-fill')
  , n = require('numbro')
  , Phenotypes = require('../../../lib/phenotype')

var precisionRound = function(number, precision) {
  var factor = Math.pow(10, precision)
  return Math.round(number * factor) / factor
}
increment = 1

module.exports = {
  name: 'raj',
  description: 'Basic testing for Rohit and Raj\'s Crypto Trading Bot',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '1m')
    this.option('period_length', 'period length, same as --period', String, '1m')
    this.option('buy_factor', 'buy factor encodes the difference between buy and sell (7 for now)', Number, 3)
  },

  calculate: function (s) {
    buy_total = s.trades.reduce((sum, trade) => {
      if( trade.side === "buy"){
        return sum + trade.size;
      }
      else{
        return sum;
      }
    }, 0);
    sell_total = s.trades.reduce((sum, trade) => {
      if( trade.side === "sell"){
        return sum + trade.size;
      }
      else{
        return sum;
      }
    }, 0);
    s.period["buy_volume"] = precisionRound(buy_total, 12);
    s.period["sell_volume"] = precisionRound(sell_total, 12);
  },

  onPeriod: function (s, cb) {
    console.log("\n123123123_____" + (s.period.sell_volume / s.period.buy_volume ) + " __________ " + s.options.buy_factor)

    if (!s.in_preroll) {
      if (s.overbought) {
        s.overbought = false
        s.trend = 'overbought'
        s.signal = 'sell'
        return cb()
      }

    }

    if (typeof s.period.buy_volume === 'number' && typeof s.period.sell_volume === 'number') {
      if ((s.period.sell_volume/s.period.buy_volume) > s.options.buy_factor) {
        s.signal = 'buy'
      } else if ((s.period.sell_volume/s.period.buy_volume) < s.options.buy_factor) {
        s.signal = 'sell'
      } else {
        s.signal = null  // hold
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if (typeof s.period.buy_volume === 'number') {
      
      var color = 'grey'
      if (s.period.buy_volume > s.period.sell_volume) {
        color = 'green'
      }
      else if (s.period.buy_volume < s.period.sell_volume) {
        color = 'red'
      }
      cols.push(z(8, n(s.period.buy_volume+increment).format('+00.0000'), ' ')[color])
      cols.push(z(8, n(s.period.sell_volume+increment).format('+00.0000'), ' ').cyan)
      increment+= 1
    }
    else {
      console.log("got here2")
      cols.push('         ')
    }
    return cols
  },

  
  phenotypes: {
    // -- common
    period_length: Phenotypes.RangePeriod(1, 120, 'm'),
    period: Phenotypes.RangePeriod(1, 120, 'm'),
    // -- strategy
    buy_factor: Phenotypes.Range(1, 100)
  }
}