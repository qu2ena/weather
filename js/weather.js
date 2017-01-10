'use strict';

let weatherAPI = 'weather';
let hourlyAPI  = 'forecast';
let dailyAPI   = 'forecast/daily';
let imgAPI     = 'http://openweathermap.org/img/w/';
let imgType    = '.png';
let wFlag = true;
let hFlag = true;
let dFlag = true;

$(document).ready(function() {
	
	let cookieKey = Cookies.get('q');
	if (cookieKey) {

		requestData(cookieKey);
	} else {

		requestData('haerbin');   //默认请求哈尔滨
	}

	//点击搜索按钮
	$('.search-btn').on('click', function(event) {

		searchEvent();
	});

	//输入框
	let searchInput = $('.search-key');   
	searchInput.on('keydown', function(event) {
		
		if (event.keyCode === 13) {
			searchEvent();
		} else {
			$('.error').css('opacity', '0');  //输入非回车 提示框消失 
		}
	});

	searchInput.on('focus', function(event) {
		$('.error').css('opacity', '0');
	});

	dailyOrHourly();
});

/*----搜索事件处理----*/
function searchEvent() {

	let searchKey = $.trim($('.search-key').val());
	console.log(searchKey);
	if (!searchKey) {

		$('.error').css('opacity', '1');
		$('.search-key').val('');

	} else {
		
		if (wFlag && hFlag && dFlag) {

			requestData(searchKey);
			Cookies.set('q', searchKey, {expires: 1});

			wFlag = false;
			hFlag = false;
			dFlag = false;
		}
	}	
}

/*----daily & hourly 切换----*/
function dailyOrHourly() {
	$('button').on('click', function() {
		$(this).addClass('highlight').siblings().removeClass('highlight');
		let temp = $(this).attr('id');
		$(`.content-${temp}`).addClass('active').siblings().removeClass('active');
	});
}

/*----数据请求----*/
function getData(pathName,searchKey) {

	let appId = '489646e192394f377c0d39c76399cf49';
	return $.ajax({
		url: `http://api.openweathermap.org/data/2.5/${pathName}`,
		type: 'GET',
		data: {
			'q': searchKey, 
			'units': 'metric',
			'appid': appId
		}
	});
}

function requestData(key) {
	getData(weatherAPI, key).done(function(data) {
		weatherVm.value = processWeatherData(data);
		wFlag = true;
	});

	getData(dailyAPI, key).done(function(data) {
		dailyVm.daily = processDailyData(data);
		dFlag = true;
	});

	getData(hourlyAPI, key).done(function(data) {
		hourlyVm.hourly = processHourlyData(data);
		hFlag = true;
	});
}


/*----Vue部分----*/
let weatherVm = new Vue({
		el: '.weather', 
		data: {
			value: {
				'dt': null,
				'coord': null,
				'clouds': {'all': null},
				'main': {'humidity': null, 'temp': null, 'pressure': null},
				'name': null,
				'sys': {'country': null, 'sunrise': null, 'sunset': null},
				'weather':[{'description': null, 'icon': null}],
				'wind': {'deg': null, 'speed': null}
			}
		}
});

function processWeatherData(data) {

	data.dt = dateFormat(data.dt);
	data.main.temp = numberFixed(data.main.temp);
	data.weather[0].icon = `${imgAPI}${data.weather[0].icon}${imgType}`;
	data.wind.speed = `${windLevel(data.wind.speed)} ${data.wind.speed}m/s`;
	data.wind.deg   = `${windDirection(data.wind.deg)} ( ${data.wind.deg} ) `;
	data.sys.sunset = timeFormat(data.sys.sunset);
	data.sys.sunrise = timeFormat(data.sys.sunrise);
	data.coord = `[${data.coord.lat},${data.coord.lon}]`;

	return data;
}

/*----天气预报~每天----*/

let dailyVm = new Vue({
	el: '.daily-forecast',
	data: {
		daily: [{
			'dt': null,
			'clouds': null,
			'humidity': null,
			'isUnderZero': null,
			'pressure': null,
			'speed': null,
			'temp': {'day': null, 'night': null},
			'weather': [{'description': null, 'icon': null}]
		}]
	}
}); 

function processDailyData(data) {

	let list = [];

	data.list.forEach(function(element) {
		element.dt = dateInfo(element.dt);
		element.weather[0].icon = `${imgAPI}${element.weather[0].icon}${imgType}`;
		element.temp.day = numberFixed(element.temp.day);
		element.temp.night = numberFixed(element.temp.night);
		if(parseFloat(element.temp.day) < 0) {
			element.isUnderZero = 'true';
		}
		
		list.push(element);
	});

	return list;
}

/*----天气预报~小时----*/

let hourlyVm = new Vue({
	el: '.content-hourly',
	data: {
		hourly: {
			list: [{
				'date': null,
				'isToday': null,
				'value': [{
					'dt': null,
					'clouds': {'all': null},
					'main': {'pressure': null, 'temp': null, 'temp_max': null, 'temp_min': null},
					'weather': [{'description': null, 'icon': null}],
					'wind': {'speed': null}
				}]
			}]
		}
	}
});

function processHourlyData(data) {

    let result = {
      'list': []
    }

    for(let i = 0 ; i < data.list.length ; i++) {
    	let item = data.list[i];

    	let date = new Date(item.dt * 1000);
    	let dateStr = date.toDateString();
    	
    	item.dt = timeFormat(item.dt);
    	item.weather[0].icon = `${imgAPI}${item.weather[0].icon}${imgType}`;
    	item.main.temp_max = numberFixed(item.main.temp_max);
    	item.main.temp = numberFixed(item.main.temp);
    	item.main.temp_min = numberFixed(item.main.temp_min);

    	let isNotToday = true;
    	for(let resultItem of result.list) {
    		if (resultItem.date === dateStr) {
    			resultItem.value.push(item);
    			isNotToday = false;
    			break;
    		}
    	}

    	if (isNotToday) {
    		let temp = {
    			'date': dateStr,
    			'isToday': isToday(date),
    			'value': [item]
    		}
    		result.list.push(temp);
    	}
    }

    return result;
  }


/*----判断是否是today----*/
function isToday(date) {

    return date.toDateString() === new Date().toDateString();
}

/*----小数点后保留一位----*/
function numberFixed(num) {

	return num.toFixed(1);
}

/*----时间日期格式, eg: YYYY/MM/DD am/pm hh:mm:ss----*/
function dateFormat(seconds) {

	let date = new Date(seconds * 1000);
	return date.toLocaleString();
}

/*----时间格式, eg: 00:00----*/
function timeFormat(t) {

	let time = new Date(t * 1000);
	let hour = time.getHours();
	let minute = time.getMinutes();
	let minuteStr = minute < 10 ? `0${minute}` : `${minute}`;  
	let timeString = hour < 10 ? `0${hour}:${minuteStr}` : `${hour}:${minuteStr}`; 

	return timeString;
}

/*----日期格式, like: Thu Nov 22----*/
function dateInfo(date) {

	let temp = new Date(date * 1000);
	let month = monthFormat(temp.getMonth());
	let day   = dayFormat(temp.getDay());
	let dateStr = `${day} ${temp.getDate()} ${month}`;

	return dateStr;
}

/*----月份----*/
function monthFormat(m) {

	let monthArr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	return monthArr[m];
}

/*----星期----*/
function dayFormat(d) {

	let dayArr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	return dayArr[d];
}

/*----根据角度算风向----*/
function windDirection(deg) {

	let direct = '';

	if (deg >= 11.26 && deg <= 33.75) {
		direct = 'North-northeast';
	} else if (deg >= 33.76 && deg <= 56.25) {
		direct = 'NorthEast';
	} else if (deg >= 56.26 && deg <= 78.75) {
		direct = 'East-northeast';
	} else if (deg >= 78.76 && deg <= 101.25) {
		direct = 'East';
	} else if (deg >= 101.26 && deg <=123.75) {
		direct = 'East-southeast';
	} else if (deg >= 123.76 && deg <=146.25) {
		direct = 'SouthEast';
	} else if (deg >= 146.26 && deg <=168.75) {
		direct = 'South-southeast';
	} else if (deg >= 168.76 && deg <=191.25) {
		direct = 'South';
	} else if (deg >= 191.26 && deg <=213.75) {
		direct = 'South-southwest';
	} else if (deg >= 213.76 && deg <= 236.25) {
		direct = 'SouthWest';
	} else if (deg >= 236.26 && deg <= 258.75) {
		direct = 'West-southwest';
	} else if (deg >= 258.76 && deg <=281.25) {
		direct = 'West';
	} else if (deg >= 281.26 && deg <= 303.75) {
		direct = 'West-northwest';
	} else if (deg >= 303.76 && deg <= 326.25) {
		direct = 'NorthWest';
	} else if (deg >= 326.26 && deg <= 348.75) {
		direct = 'North-northwest';
	} else {
		direct = 'North';
	}
	return direct;
}

/*----风速算风的type--but好像不准--*/
function windLevel(speed) {
	
	let str = '';

	if (speed >= 0 && speed <= 0.2) {
		str = 'Calm';
	} else if (speed >= 0.3 && speed <= 1.5) {
		str = 'Light air';
	} else if (speed >= 1.6 && speed <= 3.3) {
		str = 'Light breeze';
	} else if (speed >= 3.4 && speed <= 5.4) {
		str = 'Gentle breeze';
	} else if (speed >= 5.5 && speed <= 7.9) {
		str = 'Moderate breeze';
	} else if (speed >= 8.0 && speed <= 10.7) {
		str = 'Fresh breeze';
	} else if (speed >= 10.8 && speed <= 13.8) {
		str = 'Strong breeze';
	} else if (speed >= 13.9 && speed <= 17.1) {
		str = 'Moderate gale';
	} else if (speed >= 17.2 && speed <= 20.7) {
		str = 'Fresh gale';
	} else if (speed >= 20.8 && speed <= 24.4) {
		str = 'Strong gale';
	} else if (speed >= 24.5 && speed <= 28.4) {
		str = 'Whole gale';
	} else if (speed >= 28.5 && speed <= 32.6) {
		str = 'Storm';
	}

	return str;
}