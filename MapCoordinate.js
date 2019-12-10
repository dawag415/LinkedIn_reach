let DEV = false;

function conversion(givenX, x1, y1, slope) {
    const foundY = slope * (givenX - x1) + y1;
    if (DEV) console.log(`conversion...givenX=${givenX}, foundY=${foundY}, x1=${x1}, y1=${y1}, slope=${slope}`);
    return foundY;
}

class MapCoordinate {
    static enableDebug(boolean = true) {
        DEV = boolean;
    }

    constructor(northLat, eastLon, southLat, westLon,
        pixelLength, pixelWidth, pixelLengthZero = 0, pixelWidthZero = 0) {
        // set boundaries
        this.minLength = pixelLengthZero; // up
        this.minWidth = pixelWidthZero; // left
        this.maxLength = pixelLength; // down
        this.maxWidth = pixelWidth; // right

        this.northLat = northLat; // up
        this.eastLon = eastLon; // left
        this.southLat = southLat; // down
        this.westLon = westLon; // right

        this.lonToX = (pixelWidthZero - pixelWidth) / (this.westLon - this.eastLon);
        this.latToY = (pixelLength - pixelLengthZero) / (this.southLat - this.northLat);
        this.xToLon = (this.westLon - this.eastLon) / (pixelWidthZero - pixelWidth);
        this.yToLat = (this.southLat - this.northLat) / (pixelLength - pixelLengthZero);

        // subMap
        this.subMap = null; // instance of MapCoordinate
        this.subRatioMinLength = null; // up
        this.subRatioMinWidth = null; // left
        this.subRatioMaxLength = null; // down
        this.subRatioMaxWidth = null; // right
    }

    setBoundary(northLat, eastLon, southLat, westLon,
        pixelLength = null, pixelWidth = null, pixelLengthZero = null, pixelWidthZero = null) {
        if (pixelLength != null) this.maxLength = pixelLength;
        if (pixelWidth != null) this.maxWidth = pixelWidth;
        if (pixelLengthZero != null) this.minLength = pixelLengthZero;
        if (pixelWidthZero != null) this.minWidth = pixelWidthZero;

        this.northLat = northLat;
        this.eastLon = eastLon;
        this.southLat = southLat;
        this.westLon = westLon;

        this.lonToX = (this.minWidth - this.maxWidth) / (this.westLon - this.eastLon);
        this.latToY = (this.maxLength - this.minLength) / (this.southLat - this.northLat);
        this.xToLon = (this.westLon - this.eastLon) / (this.minWidth - this.maxWidth);
        this.yToLat = (this.southLat - this.northLat) / (this.maxLength - this.minLength);
    }

    setLengthWidth(pixelLength, pixelWidth, pixelLengthZero = null, pixelWidthZero = null) {
        if (pixelLengthZero != null) this.minLength = pixelLengthZero;
        if (pixelWidthZero != null) this.minWidth = pixelWidthZero;
        this.maxLength = pixelLength;
        this.maxWidth = pixelWidth;

        this.lonToX = (this.minWidth - this.maxWidth) / (this.westLon - this.eastLon);
        this.latToY = (this.maxLength - this.minLength) / (this.southLat - this.northLat);
        this.xToLon = (this.westLon - this.eastLon) / (this.minWidth - this.maxWidth);
        this.yToLat = (this.southLat - this.northLat) / (this.maxLength - this.minLength);

        if (DEV) console.log(`MapCoordinate.setLengthWidth...subMap=${(this.subMap != null)}, pixelLength=${this.pixelLength}, pixelWidth=${this.pixelWidth}, pixelLengthZero=${pixelLengthZero}, pixelWidthZero=${pixelWidthZero}`);
        if (this.subMap != null) {
            this.subMap.setLengthWidth(
                this.subRatioMaxLength * (this.maxLength - this.minLength),
                this.subRatioMaxWidth * (this.maxWidth - this.minWidth),
                this.subRatioMinLength * (this.maxLength - this.minLength),
                this.subRatioMinWidth * (this.maxWidth - this.minWidth),
            );
        }
    }

    getMapBoundary() {
        const {
            northLat, eastLon, southLat, westLon,
            minLength, minWidth, maxLength, maxWidth,
        } = this;
        return {
            northLat,
            eastLon,
            southLat,
            westLon,
            minLength,
            minWidth,
            maxLength,
            maxWidth,
        };
    }

    getLon(x) {
        const { maxWidth, eastLon, xToLon, subMap } = this;
        return conversion(x, maxWidth, eastLon, xToLon);
    }
    getLat(y) {
        const { minLength, northLat, yToLat, subMap } = this;
        return conversion(y, minLength, northLat, yToLat);
    }

    getX(longitude) {
        const { lonToX, maxWidth, eastLon } = this;
        if (DEV) console.log(`MapCoordinate.getX...lon=${longitude}`);
        return conversion(longitude, eastLon, maxWidth, lonToX);
    }
    getY(latitude) {
        const { minLength, latToY, northLat, subMap } = this;
        if (DEV) console.log(`MapCoordinate.getY...lat=${latitude}`);
        return conversion(latitude, northLat, minLength, latToY);
    }
    getXY(latitude, longitude) {
        if (this.subMap && this.subMap.isInBoundary(latitude, longitude)) {
            if (DEV) console.log(`MapCoordinate.subMap.getXY...lat=${latitude}, lon=${longitude}, this.subMap`, this.subMap);
            return this.subMap.getXY(latitude, longitude);
        }
        if (this.isInBoundary(latitude, longitude)) {
            if (DEV) console.log(`MapCoordinate.getXY...lat=${latitude}, lon=${longitude}`);
            return { x: this.getX(longitude), y: this.getY(latitude) };
        }
        return { x: null, y: null };
    }

    isInBoundary(latitude, longitude) {
        const { northLat, eastLon, southLat, westLon, subMap } = this;
        return (
            (subMap != null && subMap.isInBoundary(latitude, longitude))
            || (latitude >= southLat && latitude <= northLat
                && longitude >= westLon && longitude <= eastLon)
        );
    }

    setSubBoundary(northLat, eastLon, southLat, westLon,
        pixelLength = null, pixelWidth = null, pixelLengthZero = null, pixelWidthZero = null) {
        if (DEV) console.log(`MapCoordinate.setSubBoundary...start, subMapIsSet=${(this.subMap != null)}, `);
        if (this.subMap == null) {
            this.subMap = new MapCoordinate(northLat, eastLon, southLat, westLon,
                pixelLength, pixelWidth, pixelLengthZero, pixelWidthZero);
            this.subRatioMinLength = pixelLengthZero / (this.maxLength - this.minLength);
            this.subRatioMinWidth = pixelWidthZero / (this.maxWidth - this.minWidth);
            this.subRatioMaxLength = pixelLength / (this.maxLength - this.minLength);
            this.subRatioMaxWidth = pixelWidth / (this.maxWidth - this.minWidth);
        } else {
            this.subMap.setBoundary(northLat, eastLon, southLat, westLon,
                pixelLength, pixelWidth, pixelLengthZero, pixelWidthZero);
        }
        if (DEV) console.log(`MapCoordinate.setSubBoundary...end, subMap=${(this.subMap != null)}, ${this.subRatioMaxLength} ${this.subRatioMaxWidth} ${this.subRatioMinLength} ${this.subRatioMinWidth}`, this);
    }

    getSubMap() {
        return this.subMap;
    }
}

export default MapCoordinate;