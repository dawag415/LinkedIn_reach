import React, { Component } from 'react';
import { Image, Dimensions, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import ViewTransformer from './ViewTransformer'
import { Icon } from 'react-native-elements'; // {Icon} used for issue markers
import MapCoordinate from './MapCoordinate';

/**
 * Transformable single layer raster map with annotations
 * (AKA scroll and zoom capable jpg map or similar image with more images on top)
 * Modifed from transformable-image https://github.com/ldn0x7dc/react-native-transformable-image
 */

let DEV = false;

function sameSource(source, nextSource) {
    if (source === nextSource) {
        return true;
    }
    if (source && nextSource) {
        if (source.uri && nextSource.uri) {
            return source.uri === nextSource.uri;
        }
    }
    return false;
}

class MapView extends Component {
    static enableDebug() {
        DEV = true;
    }

    static propTypes = {
        map: PropTypes.shape({
            northLat: PropTypes.number.isRequired,
            eastLon: PropTypes.number.isRequired,
            southLat: PropTypes.number.isRequired,
            westLon: PropTypes.number.isRequired,
            subMap: PropTypes.shape({
                northLat: PropTypes.number.isRequired,
                eastLon: PropTypes.number.isRequired,
                southLat: PropTypes.number.isRequired,
                westLon: PropTypes.number.isRequired,
                pixelLength: PropTypes.number.isRequired,
                pixelWidth: PropTypes.number.isRequired,
                pixelLengthZero: PropTypes.number.isRequired,
                pixelWidthZero: PropTypes.number.isRequired,
            }),
        }).isRequired,
        markerTypeKey: PropTypes.string,
        markers: PropTypes.arrayOf(PropTypes.shape({
            latitude: PropTypes.number.isRequired,
            longitude: PropTypes.number.isRequired,
            markerType: PropTypes.string,
        })),
        markerIcons: PropTypes.arrayOf(PropTypes.shape({
            markerType: PropTypes.string,
            name: PropTypes.string.isRequired,
            type: PropTypes.string,
            size: PropTypes.number,
        })),
        pixels: PropTypes.shape({
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
        }),
        source: PropTypes.any,
        style: PropTypes.object,
        defaultIcon: PropTypes.shape({
            name: PropTypes.string,
            type: PropTypes.string,
            color: PropTypes.string,
            size: PropTypes.number,
        }),
        userIcon: PropTypes.shape({
            name: PropTypes.string,
            type: PropTypes.string,
            color: PropTypes.string,
            size: PropTypes.number,
        }),

        enableUserTracking: PropTypes.bool,
        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        onSingleTapConfirmed: PropTypes.func,
        onTransformGestureReleased: PropTypes.func,
        onViewTransformed: PropTypes.func,
        onLoad: PropTypes.func,
        onLoadStart: PropTypes.func,
    };

    static defaultProps = {
        map: {
            subMap: undefined,
        },
        markerTypeKey: 'markerType',
        markers: [],
        markerIcons: [],
        pixels: undefined,
        source: undefined,
        style: undefined,
        defaultIcon: {
            name: 'location-pin',
            type: 'entypo',
            color: 'dimgray',
            size: 30,
        },
        userIcon: {
            name: 'person-pin',
            color: 'midnightblue',
            size: 30,
        },

        enableUserTracking: true,
        enableTransform: true,
        enableScale: true,
        enableTranslate: true,
        onSingleTapConfirmed: undefined,
        onTransformGestureReleased: undefined,
        onViewTransformed: undefined,
        onLoad: undefined,
        onLoadStart: undefined,
    };


    constructor(props) {
        super(props);

        const { northLat, eastLon, southLat, westLon } = this.props.map;

        this.state = {
            map: new MapCoordinate(northLat, eastLon, southLat, westLon, 0, 0),
            latitude: null,
            longitude: null,
            error: null,

            width: 0,
            height: 0,
            markerOffsetX: {},
            markerOffsetY: {},
            userOffsetX: 0,
            userOffsetY: 0,
            scale: 0,
            paddingTop: 0,
            paddingLeft: 0,

            imageLoaded: false,
            pixels: undefined,
            keyAcumulator: 1,

            markerWait: null,
            markerLastRender: 0,
            isForceUpdate: false,
            markerInterval: 150,
            markerWaitTime: 200,
        };
    }

    componentWillMount() {
        if (!this.props.pixels) {
            if (DEV) console.log('MapView...componentWillMount.getImageSize');
            this.getImageSize(this.props.source);
        }
        if (DEV) console.log(`MapView...state.pixels=${JSON.stringify(this.state.pixels)}`);
    }

    componentDidMount() {
        if (this.props.enableUserTracking) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    if (DEV) console.log(`geolocation.watchPosition...position=${JSON.stringify(position)}`);
                    this.setState({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        error: null,
                    });
                },
                error => this.setState({ error: error.message }),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 10 },
            );
            if (DEV) console.log(`geolocation.error...${this.state.error}`);
        }
        setTimeout(() => this.setState({ isForceUpdate: true }), 2000);
    }

    componentWillReceiveProps(nextProps) {
        if (!sameSource(this.props.source, nextProps.source)) {
            // image source changed, clear last image's pixels info if any
            this.setState({ pixels: undefined, keyAcumulator: this.state.keyAcumulator + 1 });
            this.getImageSize(nextProps.source);
        }
    }

    componentWillUnmount() {
        if (this.props.enableUserTracking) navigator.geolocation.clearWatch(this.watchId);
    }

    onLoadStart = (e) => {
        if (this.props.onLoadStart) this.props.onLoadStart(e);
        this.setState({
            imageLoaded: false,
        });
    }

    onLoad = (e) => {
        if (this.props.onLoad) this.props.onLoad(e);
        this.setState({
            imageLoaded: true,
        });
    }

    onLayout = (e) => {
        const { width, height } = e.nativeEvent.layout;
        if (this.state.width !== width || this.state.height !== height) {
            this.setState({
                width,
                height,
            });
        }
    }

    onViewTransformed = (e) => {
        const { scale } = e;
        if (this.state.scale !== scale) this.setState({ scale });
    }

    getCoordinates() {
        return {
            latitude: this.state.latitude,
            longitude: this.state.longitude,
        };
    }

    getImageSize(source) {
        if (!source) return;

        if (DEV)  console.log(`getImageSize...${JSON.stringify(source)}`);

        if (typeof Image.getSize === 'function') {
            if (source && source.uri) {
                Image.getSize(
                    source.uri,
                    (width, height) => {
                        if (DEV) console.log(`getImageSize...width=${width}, height=${height}`);
                        if (width && height) {
                            if (this.state.pixels
                                && this.state.pixels.width === width
                                && this.state.pixels.height === height) {
                                // no need to update state
                            } else {
                                // set state and subMap
                                this.setState({ pixels: { width, height } });
                                if (DEV) console.log(`MapView...will set subBoundary, map=${JSON.stringify(this.props.map)}`);
                                if (this.props.map.subMap != null && this.state.map.getSubMap() == null) {
                                    if (DEV) console.log(`MapView...setting subBoundary, map=${JSON.stringify(this.props.map)}`);
                                    const { subMap } = this.props.map;
                                    this.state.map.setLengthWidth(height, width);
                                    this.state.map.setSubBoundary(
                                        subMap.northLat,
                                        subMap.eastLon,
                                        subMap.southLat,
                                        subMap.westLon,
                                        subMap.pixelLength,
                                        subMap.pixelWidth,
                                        subMap.pixelLengthZero,
                                        subMap.pixelWidthZero,
                                    );
                                }
                            }
                        }
                    },
                    (error) => {
                        console.error(`getImageSize...error=${JSON.stringify(error)}, source=${JSON.stringify(source)}`);
                    });
            } else {
                console.warn('getImageSize...please provide pixels prop for local images');
            }
        } else {
            console.warn('getImageSize...Image.getSize function not available before react-native v0.28');
        }
    }

    centerIsOutOfBounds(longitude, latitude) {
        if (longitude > this.props.map.eastLon || longitude < this.props.map.westLon) {
            return true;
        } else if ( latitude > this.props.map.northLat || latitude < this.props.map.southLat) {
            return true;
        }
        return false;
    }

    getMapCenterCoordinates() {
        return new Promise(resolve => this.MapRef.measure((fx, fy, w, h, px, py) => {
            const { scale, height, width, paddingTop, paddingLeft } = this.state;
            const yTop = -py;
            const xLeft = -px;
            const yCenter = yTop + height / 2;
            const xCenter = xLeft + width / 2;
            const yCscale = yCenter / scale;
            const xCscale = xCenter / scale;
            const x = xCscale - paddingLeft;
            const y = yCscale - paddingTop;
            const longitude = this.state.map.getLon(x);
            const latitude = this.state.map.getLat(y);

            const isOutOfBounds = this.centerIsOutOfBounds(longitude, latitude);

            // console.log(
            //     `getMapCenterCoordinates
            //     h, height: ${h}, ${height}
            //     w, width: ${w}, ${width}
            //     yTop: ${yTop}
            //     xLeft: ${xLeft}

            //     yCenter: ${yCenter}
            //     xCenter: ${xCenter}
            //     yCscale: ${yCscale}
            //     xCscale: ${xCscale}
            //     x: ${x}
            //     y: ${y}
            //     lon: ${longitude}
            //     lat: ${latitude}`,
            // );
            resolve({ latitude, longitude, isOutOfBounds });
        }));
    }

    /**
     * set limits on marker re-render rates with interval/wait times between calls
     * @returns {function} renderMarkers;
     */
    throttleRenderMarker() {
        const { paddingLeft, paddingTop, markerInterval, markerWaitTime, markerLastRender, markerWait, isForceUpdate } = this.state;
        if (isForceUpdate === true) {
            // Wait and render after the last render called
            if (DEV) console.log('forcing update');
            this.state.isForceUpdate = false;
            return this.renderMarkers(paddingTop, paddingLeft);
        }
        if (Date.now() - markerLastRender > markerInterval) {
            // console.log(`markerInterval exceeded: ${Date.now() - markerLastRender}`);
            if (markerWait != null) {
                // console.log('clearTimeout');
                clearTimeout(markerWait);
            }
            if (isForceUpdate === false) {
                // console.log('setTimeout');
                this.state.markerWait = setTimeout(
                    () => this.setState({ isForceUpdate: true, markerWait: null }),
                    markerWaitTime,
                );
            }
            this.state.markerLastRender = Date.now();
            // Enable to render on every markerInterval
            // return this.renderMarkers(paddingTop, paddingLeft);
        }
        //console.log('skipping marker render');
        return null;
    }

    filterIcons(issue) {
        const { markerTypeKey, iconsToDisplay, startDate, endDate } = this.props;
        let shouldFilter = false;
        if (!iconsToDisplay.find(v => v ? v[markerTypeKey] === issue[markerTypeKey] : null)) {
            shouldFilter = true;
        }
        if (issue.date < this.props.startDate || issue.date > this.props.endDate) {
            shouldFilter = true;
        }
        return (shouldFilter);
    }

    markerSelector(markerType) {
        const { markerTypeKey } = this.props;
        let marker = this.props.markerIcons.find(v => v[markerTypeKey] === markerType);
        if (!marker) marker = this.props.defaultIcon;
        return marker;
    }

    renderMarker(m, i, paddingTop, paddingLeft, scale) {
        const { markerOffsetX, markerOffsetY, map } = this.state;
        const { markerTypeKey, markerPress } = this.props;
        const { x, y } = map.getXY(m.latitude, m.longitude);
        if (x == null || y == null) return null;
        let longPress;
        if (markerPress != null) {
            longPress = () => this.props.markerPress(m, i);
        }
        if (this.filterIcons(m)) {
            return (null);
        }
        return (
        
            <Icon
                key={i.toString()}
                containerStyle={{
                    position: 'absolute',
                    top: y - markerOffsetY[i.toString()] + paddingTop,
                    left: x - markerOffsetX[i.toString()] + paddingLeft,
                }}
                name={this.markerSelector(m[markerTypeKey]).name}
                type={this.markerSelector(m[markerTypeKey]).type}
                color={this.markerSelector(m[markerTypeKey]).color}
                size={this.markerSelector(m[markerTypeKey]).size * scale}
                onLayout={(e) => {
                    const dx = e.nativeEvent.layout.width / 2;
                    const dy = e.nativeEvent.layout.height;
                    if (!(i.toString() in markerOffsetX) || markerOffsetX[i.toString()] !== dx || markerOffsetY[i.toString()] !== dy) {
                        markerOffsetX[i.toString()] = dx;
                        markerOffsetY[i.toString()] = dy;
                    }
                }}
                onPress={longPress}
            />
        );
    }

    renderMarkers(paddingTop, paddingLeft) {
        const { markers } = this.props;
        const a = 0.5;
        const b = 1.0 - a;
        const scale = 1 / (this.state.scale * a + b);
        return (
            <View>
                {markers.map((m, i) => this.renderMarker(m, i, paddingTop, paddingLeft, scale))}
            </View>
        );
    }

    renderUser(paddingTop, paddingLeft) {
        const { latitude, longitude, map, scale, userOffsetY, userOffsetX } = this.state;
        const { userIcon } = this.props;
        const a = 0.5;
        const b = 1.0 - a;

        if (DEV) console.log(`renderUser...latitude=${latitude}, longitude=${longitude}, scale=${scale}`);
        if (!latitude || !longitude) return null;

        const { x, y } = map.getXY(latitude, longitude);
        if (x == null || y == null) return null;

        return (
            <Icon
                containerStyle={{
                    position: 'absolute',
                    top: y - userOffsetY + paddingTop,
                    left: x - userOffsetX + paddingLeft,
                }}
                name={userIcon.name}
                type={userIcon.type}
                color={userIcon.color}
                size={userIcon.size / (scale * a + b)}
                onLayout={(e) => {
                    const dx = e.nativeEvent.layout.width / 2;
                    const dy = e.nativeEvent.layout.height;
                    if (userOffsetX !== dx || userOffsetY !== dy) {
                        this.setState({
                            userOffsetX: dx,
                            userOffsetY: dy,
                        });
                    }
                }}
            />
        );
    }

    render() {
        let maxScale = 1;
        let contentAspectRatio;
        let width; // pixels
        let height; // pixels
        let paddingTop; // space above centered map
        let paddingLeft; // space above centered map
        const markerOffset = 2; // guess and check alignment of marker point

        if (this.props.pixels) {
            // if provided via props
            width = this.props.pixels.width;
            height = this.props.pixels.height;
        } else if (this.state.pixels) {
            // if got using Image.getSize()
            width = this.state.pixels.width;
            height = this.state.pixels.height;
        }

        if (width && height) {
            contentAspectRatio = width / height;
            if (this.state.width && this.state.height) {
                maxScale = Math.max(1, width / this.state.width, height / this.state.height);
                paddingTop = (markerOffset + this.state.height - (this.state.width / contentAspectRatio)) / 2;
                paddingLeft = (this.state.width - (this.state.height * contentAspectRatio)) / 2;
                if (paddingTop < 0) paddingTop = 0;
                if (paddingLeft < 0) paddingLeft = 0;
                this.state.paddingTop = paddingTop;
                this.state.paddingLeft = paddingLeft;
            }
            this.state.map.setLengthWidth(height / maxScale, width / maxScale);
        }

        return (
            <ViewTransformer
                // ref='viewTransformer'
                key={`viewTransformer#${this.state.keyAccumulator}`} // when image source changes, we should use a different node to avoid reusing previous transform state
                enableTransform={this.props.enableTransform && this.state.imageLoaded} // disable transform until image is loaded
                enableScale={this.props.enableScale}
                enableTranslate={this.props.enableTranslate}
                enableResistance
                onTransformGestureReleased={() => this.setState({ isForceUpdate: true, markerWait: null })}
                onViewTransformed={this.onViewTransformed}
                onSingleTapConfirmed={this.onSingleTapConfirmed}
                maxScale={maxScale}
                contentAspectRatio={contentAspectRatio}
                onLayout={this.onLayout}
                style={this.props.style}
            >
                <Image
                    ref={(c) => { this.MapRef = c; }}

                    {...this.props}
                    style={[this.props.style, { backgroundColor: 'transparent' }]}
                    resizeMode={'contain'}
                    onLoadStart={this.onLoadStart}
                    onLoad={this.onLoad}
                    capInsets={{ left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }} // on iOS, use capInsets to avoid image downsampling
                >
                    {this.throttleRenderMarker()}
                    {this.props.enableUserTracking && this.renderUser(paddingTop, paddingLeft, maxScale)}
                </Image>
            </ViewTransformer>
        );
    }
}

export default MapView;