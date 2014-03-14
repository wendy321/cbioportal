/*
 * Basic DC BarChart Component.
 * 
 * @param _param -- Input object
 *                  chartDivClass: currently only accept class name for DIV.chartDiv,
 *                                  (TODO: Add more specific parameters later) 
 *                  chartID: the current bar chart ID which is treated as
 *                           identifier using in global,
 *                  attrId: the attribute name, 
 *                  displayName: the display content of this attribute, 
 *                  transitionDuration: this will be used for initializing
 *                                      DC Bar Chart,
 *                  ndx: crossfilter dimension, used by initializing DC Bar Chart
 *                  chartColors: color schema
 *                  
 * @interface: getChart -- return DC Bar Chart Object.
 * @interface: getCluster -- return the cluster of DC Bar Chart.
 * @interface: updateParam -- pass _param to update current globel parameters,
 *                            this _param should only pass exist keys. 
 * @interface: reDrawChart -- refresh bar chart by redrawing the DC.js Bar
 *                            chart, keep other information.
 * @interface: scatterPlotCallbackFunction -- pass a function to connect with
 *                                            Scatter Plot after filtering DC
 *                                            Bar Chart.
 * @interface: postFilterCallbackFunc -- pass a function to be called after DC
 *                                       Bar Chart filtered.
 *                                       
 * @authur: Hongxin Zhang
 * @date: Mar. 2014
 * 
 */
        
var BarChart = function(){
    var barChart, cluster;
    
    //All DIV ID names are organized based on the structure rule, initialized 
    //in initParam function
    var DIV = {
        parentID : "",
        mainDiv : "",
        chartDiv : ""
    };
    
    var param = {
        chartID: "",
        className: "",
        selectedAttr: "",
        selectedAttrDisplay: "",
        transitionDuration: "",
        ndx: "",
        needLogScale: false,
        distanceArray: {}
    };
        
        
    var seperateDistance,
        startPoint,
        distanceMinMax,
        emptyValueMapping,
        xDomain = [],
        numOfGroups = 10,
        divider = 1;
            
    var postFilterCallback,
        scatterPlotCallback;
    
    //This function is designed to add functions like click, on, or other
    //other functions added after initializing this Bar Chart.
    function addFunctions() {
        barChart.on("filtered", function(chart,filter){
            var _currentFilters = barChart.filters();

            if(_currentFilters.length === 0){
                $("#" + DIV.mainDiv + " .study-view-dc-chart-change")
                            .css('display','none');
                $("#" + DIV.mainDiv)
                        .css({'border-width':'1px', 'border-style':'solid'});
            }else{
                $("#" + DIV.mainDiv + " .study-view-dc-chart-change")
                            .css('display','block');
                $("#" + DIV.mainDiv)
                        .css({'border-width':'2px', 'border-style':'inset'});
            }

            updateScatterPlot(_currentFilters);
            removeMarker();
            postFilterCallback();
        });
    }
    
    //Initialize HTML tags which will be used for current Bar Chart.
    function createDiv() {
        var _logCheckBox = "";
        
        
        if(param.needLogScale){
            _logCheckBox = "<span id='scale-span-"+param.chartID+
                "' style='float:right; font-size:10px; margin-right: 15px;"+
                "margin-top:3px;color: grey'>Log Scale X</span>"+
                "<input type='checkbox' value='"+ param.chartID +","+ 
                param.distanceArray.max +","+ 
                param.distanceArray.min + "," + param.selectedAttr+
                "' id='scale-input-"+param.chartID+
                "' class='study-view-bar-x-log' checked='checked'></input>";
        }
        
        var contentHTML = "<div id=\"" + DIV.chartDiv + 
                "\" class='"+ param.className +"'  value='" + param.selectedAttr + "," + 
                param.selectedAttrDisplay + ",bar'><div style='width:100%; float:right'>"+
                "<span class='study-view-dc-chart-delete'>x</span>"+
                "<a href='javascript:StudyViewInitCharts.getChartsByID("+ 
                param.chartID +").getChart().filterAll();dc.redrawAll();'>"+
                "<span title='Reset Chart' class='study-view-dc-chart-change'>"+
                "RESET</span></a>"+_logCheckBox +"</div></div>"+
                "<div style='width:100%; float:center;text-align:center;'>"+
                "<chartTitleH4>" + param.selectedAttrDisplay + "</chartTitleH4></div>";
        
        if($("#" + DIV.mainDiv).length === 0){
            $("#" + DIV.parentID)
                    .append("<div id=\"" + DIV.mainDiv+ 
                    "\" class='study-view-dc-chart study-view-bar-main'>" + 
                    contentHTML + "</div>");
        }
    }
    
    //This function is designed to draw red down triangle above marked bar.
    //  TODO: Add comments for each component.
    function drawMarker(_value) {
        var _x,
            _y,
            _numItemOfX,
            _numOfBar,
            _barInfo = [],
            _xValue = [],
            _xTranslate = [];
        
        var _allBars = $('#' + DIV.chartDiv + " .chart-body").find('rect'),
            _allAxisX = $('#' + DIV.chartDiv + " .axis.x").find("g"),
            _transformChartBody = trimTransformString($('#' + DIV.chartDiv + " .chart-body").attr("transform")),
            _transformAxiaX = trimTransformString($('#' + DIV.chartDiv + " .axis.x").attr("transform"));
       
        
        $.each(_allBars,function(key,value){
            var _barDatum = {}
            
            _barDatum.x = Number($(this).attr('x')) + Number(_transformChartBody[0]);
            _barDatum.y = Number($(this).attr('y')) + Number(_transformChartBody[1]) - 5;
            _barDatum.width = Number($(this).attr('width'));
            _barInfo.push(_barDatum);
        });
        
        _numOfBar = _barInfo.length;
        
        $.each(_allAxisX,function(key,value){
            _xValue[key] = Number($(this).select('text').text());
            _xTranslate[key] = Number(trimTransformString($(this).attr('transform'))[0]) + Number(_transformAxiaX[0]);
        });
        
        _numItemOfX = _xTranslate.length;
        
        if(_value === 'NA'){
            _x = _barInfo[_numOfBar-1].x + _barInfo[_numOfBar-1].width / 2;
            _y= _barInfo[_numOfBar-1].y;
        }else {
            for(var i=0 ; i< _numItemOfX ; i++){
                if(_value < _xValue[i]){
                    for(var j=0 ; j< _numOfBar ; j++){
                        if(_barInfo[j].x < _xTranslate[i] && _barInfo[j].x > _xTranslate[i-1]){
                            _x = (_xTranslate[i] + _xTranslate[i-1])/2;
                            _y= _barInfo[j].y;
                            break;
                        }
                    }
                    break;
                }
            }
        }
        
        d3.select("#" + DIV.chartDiv + " svg").append("path")
            .attr("transform", function(d) { return "translate(" + _x + "," + _y + ")"; })
            .attr("d", d3.svg.symbol().size('25').type('triangle-down'))
            .attr('fill',"red")
            .attr('class','mark');
    }
    
    //Precalculate all parameters which will be used to initialize bar chart in
    //initDCBARChart(), will not be used in initDCLogBarChart()
    function paramCalculation() {
        var _tmpMaxDomain,
            _distanceLength = parseInt(distanceMinMax).toString().length;
        
        xDomain.length = 0;
        numOfGroups = 10;
        divider = 1;
        
        //Set divider based on the number m in 10(m)
        for( var i = 0; i < _distanceLength - 2; i++ )
            divider *= 10;
        if( param.distanceArray.max < 100 && 
                param.distanceArray.max > 20 )
            divider = 10;
        
        if(param.distanceArray.max <= 1 && 
                param.distanceArray.max > 0 && 
                param.distanceArray.min >= -1 && 
                param.distanceArray.min < 0){
            
            _tmpMaxDomain = (parseInt(param.distanceArray.max / divider) + 1) * divider;
            seperateDistance = 0.2;
            startPoint = (parseInt(param.distanceArray.min / 0.2)-1) * 0.2;
            emptyValueMapping = _tmpMaxDomain +0.2;
        
        }else if( distanceMinMax > 1 ){
            
            seperateDistance = (parseInt(distanceMinMax / (numOfGroups * divider)) + 1) * divider;
            _tmpMaxDomain = (parseInt(param.distanceArray.max / divider) + 1) * divider;
            startPoint = parseInt(param.distanceArray.min / divider) * divider;
            emptyValueMapping = _tmpMaxDomain+seperateDistance;
        
        }else if( distanceMinMax < 1 && param.distanceArray.min >=0 ){
            
            seperateDistance = 0.1;
            startPoint = 0;
            emptyValueMapping = 1.1;
        
        }else{
            
            seperateDistance = 0.1;
            startPoint = -1;
            emptyValueMapping = _tmpMaxDomain + 0.1;
        
        }
        
        for( var i = 0; i <= numOfGroups; i++ ){
            var _tmpValue = i * seperateDistance + startPoint;
            
            _tmpValue = Number(cbio.util.toPrecision(Number(_tmpValue),3,0.1));
            xDomain.push(_tmpValue);
            
            //If the current tmpValue already bigger than maxmium number, the
            //function should decrease the number of bars and also reset the
            //Mappped empty value.
            if(_tmpValue > param.distanceArray.max){
                
                //Reset the empty mapping value 
                if(distanceMinMax > 1000 || distanceMinMax < 1){
                    emptyValueMapping = (i+1)*seperateDistance + startPoint;
                }
                
                //If the distance of Max and Min value is smaller than 1, give
                //a more precise value
                if(distanceMinMax < 1){
                    emptyValueMapping = Number(cbio.util.toPrecision(Number(emptyValueMapping),3,0.1));
                }
                
                break;
            }
        }
    }
    
    //Initialize BarChart in DC.js
    function initDCBarChart() {
        var _xunitsNum,
            _hasEmptyValue = false;
        
        barChart = dc.barChart("#" + DIV.chartDiv);
        
        cluster = param.ndx.dimension(function (d) {
            var returnValue = d[param.selectedAttr];
            if(returnValue === "NA" || returnValue === '' || returnValue === 'NaN'){
                _hasEmptyValue = true;
                return emptyValueMapping;
            }else{
                if(d[param.selectedAttr] >= 0){
                    returnValue =  parseInt( 
                                    d[param.selectedAttr] / 
                                    seperateDistance) * 
                                    seperateDistance + seperateDistance / 2;
                }else{
                    returnValue =  ( parseInt( 
                                        d[param.selectedAttr] / 
                                        seperateDistance ) - 1 ) * 
                                    seperateDistance + seperateDistance / 2;
                }
                
                return returnValue;
            }
        });
        
        if(_hasEmptyValue){
            xDomain.push( Number( 
                                cbio.util.toPrecision( 
                                    Number(emptyValueMapping), 3, 0.1 )
                                )
                        );
        }
        
        barChart
            .width(370)
            .height(180)
            .margins({top: 10, right: 20, bottom: 30, left: 40})
            .dimension(cluster)
            .group(cluster.group())
            .centerBar(true)
            .elasticY(true)
            .elasticX(false)
            .turnOnControls(true)
            .mouseZoomable(false)
            .brushOn(true)
            .transitionDuration(param.transitionDuration)
            .renderHorizontalGridLines(true)
            .renderVerticalGridLines(true);
    
        barChart.x( d3.scale.linear()
                        .domain([ 
                                  xDomain[0] - seperateDistance ,
                                  xDomain[xDomain.length - 1] + seperateDistance
                                ]));
        
        barChart.yAxis().tickFormat(d3.format("d"));            
        barChart.xAxis().tickFormat(function(v) {
            if(v === emptyValueMapping){
                return 'NA'; 
            }else{
                return v;
            }
        });
        
        barChart.xAxis().tickValues(xDomain);
        
        //1.3 could be changed. It will decide the size of each bar.
        _xunitsNum = xDomain.length*1.3;
        
        //Set the min
        if(_xunitsNum <= 5){
            barChart.xUnits(function(){return 5;});
        }else{
            barChart.xUnits(function(){return _xunitsNum;});
        }
    }
    
    //Initialize BarChart in DC.js
    function initDCLogBarChart() {
        
        var _xunitsNum,
            _domainLength,
            _maxDomain = 10000;
    
        emptyValueMapping = "1000";
        xDomain.length =0;

        barChart = dc.barChart("#" + DIV.chartDiv);
        
        for(var i=0; ;i+=0.5){
            var _tmpValue = parseInt(Math.pow(10,i));
            
            xDomain.push(_tmpValue);
            if(_tmpValue > param.distanceArray.max){
                
                emptyValueMapping = Math.pow(10,i+0.5);
                xDomain.push(emptyValueMapping);
                _maxDomain = Math.pow(10,i+1);
                break;
            }
        }
        
        _domainLength = xDomain.length;
        
        cluster = param.ndx.dimension(function (d) {
            var i, _returnValue = Number(d[param.selectedAttr]);
            
            if(isNaN(_returnValue)){
                return emptyValueMapping;
            }else{
                
                _returnValue = Number(_returnValue);
                for(i = 1;i < _domainLength; i++){
                    if( d[param.selectedAttr] < xDomain[i] && 
                        d[param.selectedAttr] >= xDomain[i-1]){
                        
                        _returnValue = parseInt( Math.pow(10, i / 2 - 0.25 ));
                    }
                }
                return _returnValue;
            }
        }); 
        
        barChart
            .width(370)
            .height(180)
            .margins({top: 10, right: 20, bottom: 30, left: 40})
            .dimension(cluster)
            .group(cluster.group())
            .centerBar(true)
            .elasticY(true)
            .elasticX(false)
            .turnOnControls(true)
            .mouseZoomable(false)
            .brushOn(true)
            .transitionDuration(param.transitionDuration)
            .renderHorizontalGridLines(true)
            .renderVerticalGridLines(true);
    
        barChart.centerBar(true);
        barChart.x(d3.scale.log().nice().domain([0.7,_maxDomain]));
        barChart.yAxis().tickFormat(d3.format("d"));            
        barChart.xAxis().tickFormat(function(v) {
            var _returnValue = v;
            if(v === emptyValueMapping){
                _returnValue = 'NA';
            }else{
                var index = xDomain.indexOf(v);
                if(index % 2 === 0)
                    return v.toString();
                else
                    return '';
            }
            return _returnValue; 
        });            
        
        barChart.xAxis().tickValues(xDomain);
        
        _xunitsNum = xDomain.length*1.3;
        
        if(_xunitsNum <= 5){
            barChart.xUnits(function(){return 5;});
        }else{
            barChart.xUnits(function(){return _xunitsNum;});
        }
    }
    
    //Initial global parameters by using passed object.
    function initParam(_param) {
        var _baseID = _param.baseID;
        
        param.className = _param.chartDivClass,
        param.chartID = _param.chartID;
        param.selectedAttr = _param.attrID;
        param.selectedAttrDisplay = _param.displayName;
        param.transitionDuration = _param.transitionDuration;
        param.ndx = _param.ndx;
        param.needLogScale = _param.needLogScale;
        param.distanceArray = _param.distanceArray;
        
        distanceMinMax = param.distanceArray.diff;
    
        DIV.mainDiv = _baseID + "-dc-chart-main-" + param.chartID;
        DIV.chartDiv = _baseID + "-dc-chart-" + param.chartID;
        DIV.parentID = _baseID + "-charts";
    }

    
    //Remove drawed Bar Markder.
    function removeMarker() {
        $("#" + DIV.chartDiv).find('svg .mark').remove();
    }
    
    function trimTransformString(_string){
        var _tmpString = _string.split("(");
        
        _tmpString = _tmpString[1].split(")");
        _tmpString = _tmpString[0].split(",");
        
        return _tmpString;
    }
    
    //Bar Chart will have communications with ScatterPlot, this function is used
    //to call the callback function.
    function updateScatterPlot(_currentFilters) {
        scatterPlotCallback(_currentFilters);
    }
    
    return {
        init: function(_param) {
            initParam(_param);
            createDiv();
            
            //Logged Scale Plot does not need to calculate param. These two
            //kinds of Bar Chart using same param but initilize them individually
            if(param.needLogScale){
                initDCLogBarChart();
            }else{
                paramCalculation();
                initDCBarChart();
            }
            addFunctions();
        },

        getChart : function() {
            return barChart;
        },
        
        updateParam : function(_param) {
            for(var key in _param){
                param[key] = _param[key];
            }
        },
        
        getCluster: function() {
            return cluster;
        },
        
        reDrawChart: function() {
            if(param.needLogScale){
                initDCLogBarChart();
            }else{
                paramCalculation();
                initDCBarChart();
            }
            addFunctions();
        },
        
        scatterPlotCallbackFunction: function (_callback) {
            scatterPlotCallback = _callback;
        },
        
        postFilterCallbackFunc: function(_callback) {
            postFilterCallback = _callback;
        },
        
        removeMarker: removeMarker,
        drawMarker: drawMarker,
    };
};