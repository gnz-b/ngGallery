(function () {
    'use-strict';

    angular.module('jkuri.gallery', []).directive('ngGallery', ngGallery);

    ngGallery.$inject = ['$document', '$timeout', '$q', '$templateCache'];

    function ngGallery($document, $timeout, $q, $templateCache) {

        // test version
        var defaults = {
            baseClass: 'ng-gallery',
            thumbClass: 'ng-thumb',
            templateUrl: 'ng-gallery.html'
        };

        var keys_codes = {
            enter: 13,
            esc: 27,
            left: 37,
            right: 39
        };

        function setScopeValues(scope, attrs) {
            scope.baseClass = scope.class || defaults.baseClass;
            scope.thumbClass = scope.thumbClass || defaults.thumbClass;
            scope.thumbsNum = scope.thumbsNum || 3; // should be odd
        }

        var template_url = defaults.templateUrl;
        // Set the default template
        $templateCache.put(template_url,
            '<div class="{{ baseClass }}">' +
            '  <div ng-repeat="i in images">' +
            '    <img ng-src="{{ i.thumb }}" class="{{ thumbClass }}" ng-click="openGallery($index)" alt="Image {{ $index + 1 }}" />' +
            '  </div>' +
            '</div>' +
            '<div class="ng-overlay" ng-show="opened">' +
            '</div>' +
            '<div class="ng-gallery-content" unselectable="on" ng-show="opened" ng-swipe-left="nextImage()" ng-swipe-right="prevImage()">' +
            '  <div class="uil-ring-css" ng-show="loading"><div></div></div>' +
            '<a href="{{getImageDownloadSrc()}}" target="_blank" ng-show="showImageDownloadButton()" class="download-image"><i class="fa fa-download"></i></a>' +
            '  <a class="close-popup" ng-click="closeGallery()"><i class="fa fa-close"></i></a>' +
            '  <a class="zoom-minus" ng-click="zoomImage(0)"><i class="fa fa-search-minus"></i></a>'+
            '  <a class="zoom-plus" ng-click="zoomImage(1)"><i class="fa fa-search-plus"></i></a>'+
            '  <a class="rotate-left" ng-click="rotationImg(0)"><i class="fa fa-rotate-right"></i></a>' +
            '  <a class="rotate-right" ng-click="rotationImg(1)"><i class="fa fa-rotate-left"></i></a>' +
            '  <a class="nav-left" ng-click="prevImage()"><i class="fa fa-angle-left"></i></a>' +
            '  <img id="gallery_img" ondragstart="return false;" draggable="false" ng-src="{{ img }}" ng-click="nextImage()" ng-show="!loading" class="effect test_gallery_img" />' +
            '  <a class="nav-right" ng-click="nextImage()"><i class="fa fa-angle-right"></i></a>' +
            '  <span class="info-text">{{ index + 1 }}/{{ images.length }} - {{ description }}</span>' +
            '  <div class="ng-thumbnails-wrapper">' +
            '    <div class="ng-thumbnails slide-left">' +
            '      <div ng-repeat="i in images">' +
            '        <img ng-src="{{ i.thumb }}" ng-class="{\'active\': index === $index}" ng-click="changeImage($index)" />' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'
        );

        return {
            restrict: 'EA',
            scope: {
                images: '=',
                thumbsNum: '@',
                hideOverflow: '='
            },
            controller: [
                '$scope',
                function ($scope) {
                    $scope.$on('openGallery', function (e, args) {
                        $scope.openGallery(args.index);
                    });
                }
            ],
            templateUrl: function (element, attrs) {
                return attrs.templateUrl || defaults.templateUrl;
            },
            link: function (scope, element, attrs) {
                setScopeValues(scope, attrs);

                if (scope.thumbsNum >= 11) {
                    scope.thumbsNum = 11;
                }

                var $body = $document.find('body');
                var $thumbwrapper = angular.element(element[0].querySelectorAll('.ng-thumbnails-wrapper'));
                var $thumbnails = angular.element(element[0].querySelectorAll('.ng-thumbnails'));

                scope.index = 0;
                scope.opened = false;

                scope.thumb_wrapper_width = 0;
                scope.thumbs_width = 0;

                var loadImage = function (i) {
                    var deferred = $q.defer();
                    var image = new Image();

                    image.onload = function () {
                        scope.loading = false;
                        if (typeof this.complete === false || this.naturalWidth === 0) {
                            deferred.reject();
                        }
                        deferred.resolve(image);
                    };

                    image.onerror = function () {
                        deferred.reject();
                    };

                    image.src = scope.images[i].img;
                    scope.loading = true;

                    return deferred.promise;
                };

                var showImage = function (i) {
                    loadImage(scope.index).then(function (resp) {
                        scope.img = resp.src;
                        smartScroll(scope.index);
                    });
                    scope.description = scope.images[i].description || '';
                };

                scope.showImageDownloadButton = function () {
                    if (scope.images[scope.index] == null || scope.images[scope.index].downloadSrc == null) return
                    var image = scope.images[scope.index];
                    return angular.isDefined(image.downloadSrc) && 0 < image.downloadSrc.length;
                };

                scope.getImageDownloadSrc = function () {
                    if (scope.images[scope.index] == null || scope.images[scope.index].downloadSrc == null) return
                    return scope.images[scope.index].downloadSrc;
                };

                scope.changeImage = function (i) {
                    scope.cleanGallery();
                    scope.index = i;
                    showImage(i);
                };

                scope.nextImage = function () {
                    scope.cleanGallery();
                    scope.index += 1;
                    if (scope.index === scope.images.length) {
                        scope.index = 0;
                    }
                    showImage(scope.index);
                };

                scope.prevImage = function () {
                    scope.cleanGallery();
                    scope.index -= 1;
                    if (scope.index < 0) {
                        scope.index = scope.images.length - 1;
                    }
                    showImage(scope.index);
                };

                scope.openGallery = function (i) {
                    if (typeof i !== undefined) {
                        scope.index = i;
                        showImage(scope.index);
                    }
                    scope.opened = true;
                    if (scope.hideOverflow) {
                        $('body').css({overflow: 'hidden'});
                    }

                    $timeout(function () {
                        var calculatedWidth = calculateThumbsWidth();
                        scope.thumbs_width = calculatedWidth.width;
                        //Add 1px, otherwise some browsers move the last image into a new line
                        var thumbnailsWidth = calculatedWidth.width + 1;
                        $thumbnails.css({width: thumbnailsWidth + 'px'});
                        $thumbwrapper.css({width: calculatedWidth.visible_width + 'px'});
                        smartScroll(scope.index);
                    });
                };


                /*
                 * 解析matrix矩阵，0°-360°，返回旋转角度
                 * 当a=b||-a=b,0<=deg<=180
                 * 当-a+b=180,180<=deg<=270
                 * 当a+b=180,270<=deg<=360
                 *
                 * 当0<=deg<=180,deg=d;
                 * 当180<deg<=270,deg=180+c;
                 * 当270<deg<=360,deg=360-(c||d);
                 * */
                function getmatrix(a,b,c,d,e,f){
                    var aa=Math.round(180*Math.asin(a)/ Math.PI);
                    var bb=Math.round(180*Math.acos(b)/ Math.PI);
                    var cc=Math.round(180*Math.asin(c)/ Math.PI);
                    var dd=Math.round(180*Math.acos(d)/ Math.PI);
                    var deg=0;
                    if(aa==bb||-aa==bb){
                        deg=dd;
                    }else if(-aa+bb==180){
                        deg=180+cc;
                    }else if(aa+bb==180){
                        deg=360-cc||360-dd;
                    }
                    return deg>=360?0:deg;
                    //return (aa+','+bb+','+cc+','+dd);
                }

                //$('#gallery_img').css('transform')  返回 getmatrix 矩阵
                scope.closeGallery = function () {
                    scope.opened = false;
                    if (scope.hideOverflow) {
                        $('body').css({overflow: ''});
                    }
                    scope.cleanGallery();
                };

                scope.cleanGallery = function () {
                    $('img.test_gallery_img').css({'transform':'rotate(0deg)'});
                    $('img.test_gallery_img').css({'-ms-transform':'rotate(0deg)'});
                    $('img.test_gallery_img').css({'-moz-transform':'rotate(0deg)'});
                    $('img.test_gallery_img').css({'-webkit-transform':'rotate(0deg)'});
                    $('img.test_gallery_img').css({'-o-transform':'rotate(0deg)'});
                    scope.deg = 0;
                    scale = 1;
                };

                // direction 左转 0  右转  1
                scope.deg = 0;
                scope.rotationImg = function (direction) {
                    // if($('img.test_gallery_img').css('transform') !== "none"){
                    //     //console.log($('#gallery_img').css('transform'));
                    //     var deg = eval('get'+$('img.test_gallery_img').css('transform'));
                    // }else{
                    //
                    // }
                    if(direction === 1){
                        $('img.test_gallery_img').css({'transform':'scale('+scale+') rotate('+(scope.deg - 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-ms-transform':'scale('+scale+') rotate('+(scope.deg - 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-moz-transform':'scale('+scale+') rotate('+(scope.deg - 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-webkit-transform':'scale('+scale+') rotate('+(scope.deg - 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-o-transform':'scale('+scale+') rotate('+(scope.deg - 90)%360+'deg)'});
                        scope.deg -= 90;
                    }else if(direction === 0){
                        $('img.test_gallery_img').css({'transform':'scale('+scale+') rotate('+(scope.deg + 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-ms-transform':'scale('+scale+') rotate('+(scope.deg + 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-moz-transform':'scale('+scale+') rotate('+(scope.deg + 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-webkit-transform':'scale('+scale+') rotate('+(scope.deg + 90)%360+'deg)'});
                        $('img.test_gallery_img').css({'-o-transform':'scale('+scale+') rotate('+(scope.deg + 90)%360+'deg)'});
                        scope.deg += 90;
                    }
                };

                /* type为1的时候 type为0*/
                var scale = 1;
                scope.zoomImage = function (type) {
                    if (type) {
                        scale += 0.1;
                    } else if (scale > 0.11) {
                        scale -= 0.1;
                    }
                    $('img.test_gallery_img').css({'transform':'scale('+scale+') rotate('+scope.deg%360+'deg'});
                    $('img.test_gallery_img').css({'-ms-transform':'scale('+scale+') rotate('+scope.deg%360+'deg'});
                    $('img.test_gallery_img').css({'-moz-transform':'scale('+scale+') rotate('+scope.deg%360+'deg'});
                    $('img.test_gallery_img').css({'-webkit-transform':'scale('+scale+') rotate('+scope.deg%360+'deg'});
                    $('img.test_gallery_img').css({'-o-transform':'scale('+scale+') rotate('+scope.deg%360+'deg'});
                };

                $body.bind('keydown', function (event) {
                    if (!scope.opened) {
                        return;
                    }
                    var which = event.which;
                    if (which === keys_codes.esc) {
                        scope.closeGallery();
                    } else if (which === keys_codes.right || which === keys_codes.enter) {
                        scope.nextImage();
                    } else if (which === keys_codes.left) {
                        scope.prevImage();
                    }

                    scope.$apply();
                });

                var calculateThumbsWidth = function () {
                    var width = 0,
                        visible_width = 0;
                    angular.forEach($thumbnails.find('img'), function (thumb) {
                        width += thumb.clientWidth;
                        width += 10; // margin-right
                        visible_width = thumb.clientWidth + 10;
                    });
                    return {
                        width: width,
                        visible_width: visible_width * scope.thumbsNum
                    };
                };

                var smartScroll = function (index) {
                    $timeout(function () {
                        var len = scope.images.length,
                            width = scope.thumbs_width,
                            item_scroll = parseInt(width / len, 10),
                            i = index + 1,
                            s = Math.ceil(len / i);

                        $thumbwrapper[0].scrollLeft = 0;
                        $thumbwrapper[0].scrollLeft = i * item_scroll - (s * item_scroll);
                    }, 100);
                };

            }
        };
    }
})();
