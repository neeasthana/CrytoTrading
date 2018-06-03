# CrytoTrading

Crypto Trading bot POC using Rohit's strategy.

## Prototype

- Buy Condition: If the sell volume is 7x more than the buy volume for the given time period
- Sell Condition: Make a 10 cent profit after fees (if it can trade in the first 2 mins) or if the bid volume is 4x more than the ask volume
- Assuming 1 minute time interval 

## Options
*thershold* - threshold to compare to for the buy and sell conditions (default is 3)
*period* - how often to poll for new trades (default 1 minute)
*profit* - amount of profit to make (default 10 cents)

## Resources:

Zenbot Github: https://github.com/DeviaVir/zenbot
Basics of creating your own Zenbot Strategy: https://www.youtube.com/watch?v=zdxWANfCbU4


## Setup

1. Install Docker 
	- install via apt-get because stable builds not available during time of installation for Ubuntu 18.04 (May 29th 2018)
	- For this version you must use *sudo* on all docker commands
	- ref: https://www.itzgeek.com/how-tos/linux/ubuntu-how-tos/how-to-install-docker-on-ubuntu-18-04-lts-bionic-beaver.html

```
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

1. Install Node.js etc. 

```
sudo apt-get install build-essential
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install
```

1. Download Github 
```
sudo apt-get install git
git clone https://github.com/neeasthana/CrytoTrading.git
```

1. Start the bot with raj's strategy
```
./zenbot.sh trade gdax.ETH-USD --paper --strategy raj --period=1m --period_length=1m
```