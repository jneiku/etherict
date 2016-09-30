/*
////////////////////////////////////

npm run backtest -- --strategy=sma --period=9,26 --frequency=288

frequency:
1 = 5 MINUTES
12 = 1 HOUR
144 = 12 HOURS
288 = DAY

////////////////////////////////////
*/

const prompt = require('prompt');
const _ = require('lodash');
const when = require('when');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const strategy = require('./strategy');
const trade = require('./trade');
const orders = require('./orders');
const history = require('./history');
const review = require('./review');

const TRAINING_DATA = './data/BTC_ETH.json';
const INITIAL_BALANCE = {'btc': 1};

function simulateMonitoring(options){
  strategy.setStrategy(options);

  fs.readFile(TRAINING_DATA, (err, data) => {
    if(err) throw err;

    data = JSON.parse(data);
    when.iterate(function(i) {
      return i+1;
    }, function(i) {
      return i >= data.length;
    }, function(i) {
      if (i % options.frequency === 0){
        let close = data[i].close;
        let delta;

        if (i === 0) {
          history.recordInitialPrice(close);
          history.recordInitialBalance(INITIAL_BALANCE);
        }

        if (i > 0) {
          let lastMark = data[i - options.frequency];
          delta = close - lastMark.close;
          history.recordPriceDelta(delta);
        }

        return trade.onData({
          close,
          delta
        });
      }
    }, 0).then(() => {
      review.reviewResults(data);
    }).done();
  });
}

function init(strategy) {
  strategy = _.pick(strategy, 'strategy', 'period', 'frequency');
  strategy.period = _.split(strategy.period, ',').map(n => parseInt(n));
  orders.updateBudget(INITIAL_BALANCE);
  simulateMonitoring(strategy);
}

if (argv.strategy
  && argv.period
  && argv.frequency) {
  init(argv);
} else {
  prompt.start();
  prompt.get([{
    name: 'strategy',
    default: 'sma'
  }, {
    name: 'period',
    default: '9,26'
  }, {
    name: 'frequency',
    default: 288
  }], function (err, result) {
    console.log('Command-line input received:', result);
    init(result);
  });

}

module.exports = {
  init
};
