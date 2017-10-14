const PERIODS = {
    ALL: 'ALL',
    ONE_YEAR: 'ONE_YEAR',
    ONE_MONTH: 'ONE_MONTH',
    ONE_WEEK: 'ONE_WEEK',
    ONE_DAY: 'ONE_DAY',
    ONE_HOUR: 'ONE_HOUR'
};

$(function(){
    // Init Chart
    const el = document.getElementById('chart');
    const chart = new App.Chart(el);

    // Init Clock
    const clock = new App.Clock();

    $dataPeriods = $('.js-period');

    $dataPeriods.on('click', function() {
        $('#periods').find('.active').removeClass('active');
        $(this).addClass('active');
    });

    function getBitcoinData(period) {
        switch(period) {
            case 'ALL':
                return App.API.getBitcoinRatesForAll();
            case 'ONE_YEAR':
                return App.API.getBitcoinRatesForOneYear();
            case 'ONE_MONTH':
                return App.API.getBitcoinRatesForOneMonth();
            case 'ONE_WEEK':
                return App.API.getBitcoinRatesForOneWeek();
            case 'ONE_DAY':
                return App.API.getBitcoinRatesForOneDay();
            case 'ONE_HOUR':
                return App.API.getBitcoinRatesForOneHour();
        }
    }

    function getLabelFormat(period) {
        switch(period) {
            case 'ALL': return 'YYYY';
            case 'ONE_YEAR': return 'MMM YYYY';
            case 'ONE_MONTH': return 'Do MMM';
            case 'ONE_WEEK': return 'dddd';
            case 'ONE_DAY': return 'HH:mm';
            case 'ONE_HOUR': return 'HH:mm';
        }
    }

    const BitcoinRepository = {};
    Object.keys(PERIODS).forEach( period =>
        BitcoinRepository[period] = new SuperRepo({
            storage: 'BROWSER_STORAGE',
            name: 'bitcoin-' + period,
            outOfDateAfter: 15 * 60 * 1000,
            mapData: r => {
                const data = App.API.mapData(r, getLabelFormat(period));

                // That's a hack. Initiate the chart every time fresh data comes
                chart.init(data);

                return data;
            },
            request: () => getBitcoinData(period)
        })
    );

    $dataPeriods.on('click', function(){
        const period = $(this).data('period');

        Object.keys(PERIODS).forEach( period => {
            if (BitcoinRepository[period]) {
                BitcoinRepository[period].destroySyncer();
            }
        });

        BitcoinRepository[period].getData()
            .then(data => chart.init(data));

        const currentMin = new Date().getMinutes();

        let timeout;
        if (currentMin === 0 || currentMin === 15 || currentMin === 30 || currentMin === 45) {
            timeout = 10 * 1000; // 10 seconds
        } else if (currentMin < 15) {
            timeout = (15 - currentMin) * 1000 + (10 * 1000);
        } else if (currentMin > 15 && currentMin < 30) {
            timeout = (30 - currentMin) * 1000 + (10 * 1000);
        } else if (currentMin > 30 && currentMin < 45) {
            timeout = (45 - currentMin) * 1000 + (10 * 1000);
        } else if (currentMin > 45 && currentMin <= 59) {
            timeout = (60 - currentMin) * 1000 + (10 * 1000);
        }

        setTimeout( () => {
            BitcoinRepository[period].getData()
                .then(() => BitcoinRepository[period].initSyncer());
        }, timeout);
    });

    $dataPeriods.eq(1).trigger('click');

    // Now
    BitcoinRepository['NOW'] = new SuperRepo({
        storage: 'BROWSER_STORAGE',
        name: 'bitcoin-now',
        outOfDateAfter: 60 * 1000,
        dataModel: [{
            value: 'value'
        }],
        mapData: data => {
            const result = data[0].value;

            /**
             * That's a hack.
             * Beautify the price.
             * https://stackoverflow.com/a/14467460/1333836
             */
            priceNow = Math.round(result).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
            document.querySelector('#price-now').textContent = `$${result}`;

            return result;
        },
        request: () => App.API.getBitcoinRatesNow()
    });

    BitcoinRepository['NOW'].getData().then( priceNow => {
        /**
         * Beautify the price.
         * https://stackoverflow.com/a/14467460/1333836
         */
        priceNow = Math.round(priceNow).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        document.querySelector('#price-now').textContent = `$${priceNow}`;
    });

    BitcoinRepository['NOW'].initSyncer();
});
