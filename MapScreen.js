import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
    Dimensions,
    Text,
    View,
    TouchableHighlight,
    TouchableOpacity,
    PermissionsAndroid,
    Platform,
    Alert,
    Modal,
    AsyncStorage,
} from 'react-native';
import { Header, Icon, CheckBox, Slider } from 'react-native-elements';
import DatePicker from 'react-native-datepicker'

import {
    fetchIssueReports,
    setIssueCoordinates,
    setIssuePark,
    fillIssueForm,
    clearIssueForm,
    submitIssueEdits,
} from '../../../actions';
import Button from '../../common/Button';
import MapView from '../../utils/MapView';
import styles from './styles';
import WPAPI from '../../../api/WildernessPatrolAPI';
import MapCoordinate from '../../utils/MapCoordinate';
import CustomAlert from '../../utils/CustomAlert';
import variables from '../../../styles/variables';
import FilterScreen from '../FilterScreen';
import { USER_ID } from '../../../constants/types.js'
const wp = WPAPI;


let DEV = false;

const { width, height } = Dimensions.get('window');

class Map extends Component {
    static navigationOptions = ({ navigation }) => {
        const {params = {}} = navigation.state;
        let title = '';
        if (navigation.state.params) {
            title = navigation.state.params.title;
        }
        const icon =
                <View> 
                    <Icon
                        component={TouchableOpacity}
                        type="font-awesome"
                        name="filter"
                        color="white"
                        size={25}
                        containerStyle={{
                            backgroundColor: 'transparent',
                            //borderWidth: 4,
                            //borderColor: 'white',
                            zIndex: 2,
                        }}
                        onPress={() => {params.setModalVisible(true)}}
                    />
                    <Text style={{color: 'white', fontSize: 10}}>
                        {`Filter Icons`}
                    </Text>
                </View>
        return {
            headerTitle: title,
            headerRight: icon,
        };
    }



    static enableDebug(boolean = true) {
        DEV = boolean;
    }

    constructor() {
        super();
        this.state = {
            Map: undefined,
            putMarkerVisible: false,
            markerIsSelected: false,
            markerOffsetX: 0,
            markerOffsetY: 0,
            showAlert: false,
            modalVisible: false,
            issuesToDisplay: [ true, true, true, true, true, true, true, true ],
            startDate: new Date("2018-01-01"),
            endDate: new Date(),
            userID: '',
        };
        this.setModalVisible = this.setModalVisible.bind(this);
        this.changeDate = this.changeDate.bind(this);
    }

    async requestFineLocationPermission() {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              'title': 'Requesting Permission To Use Your Location',
              'message': 'We need to use your location for report accuracy. ' +
                         'So you accept?'
            }
          )
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("You can use the camera")
          } else {
            console.log("Camera permission denied")
          }
        } catch (err) {
          console.warn(err)
        }
      }

      async requestCoarseLocationPermission() {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            {
              'title': 'Requesting Permission To Use Your Location',
              'message': 'We need to use your location for report accuracy. ' +
                         'So you accept?'
            }
          )
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("You can use the camera")
          } else {
            console.log("Camera permission denied")
          }
        } catch (err) {
          console.warn(err)
        }
      }

    async componentDidMount() {
        this.props.navigation.setParams({
            title: this.props.park.name,
            setModalVisible: this.setModalVisible,
        });
        const userID = await AsyncStorage.getItem(USER_ID);
        this.setState({userID});
    }

    openDrawer = () => {
        this.props.navigation.navigate('DrawerOpen');
    }

    selectMarker = (issueReport = null, index = null) => {
        if (issueReport == null || index == null) {
            this.setState({ markerIsSelected: false });
        }
        this.props.fillIssueForm(issueReport);
        this.setState({ markerIsSelected: true, putMarkerVisible: true });
    }

    showPutMarker(isVisible = false) {
        if (isVisible === false) this.state.markerIsSelected = false;
        this.setState({ putMarkerVisible: isVisible });
    }

    renderMap() {
        const map = this.props.park;
        const { issues, markerIcons, mapFile } = this.props;
        let iconsToDisplay = markerIcons.map((marker, index) => this.state.issuesToDisplay[index] == true ? marker : null);

        return (
            <MapView
                ref={(c) => { this.Map = c; }}
                style={{ width, height }}
                source={{ uri: mapFile }}
                map={map}
                markerTypeKey="issueType"
                markers={issues}
                markerIcons={markerIcons}
                iconsToDisplay={iconsToDisplay}
                markerPress={this.selectMarker}
                startDate={this.state.startDate}
                endDate={this.state.endDate}
            />
        );
    }

    renderPutMarker() {
        const { markerOffsetX, markerOffsetY } = this.state;
        const stylePutMarker = {
            position: 'absolute',
            top: height / 2 - markerOffsetY,
            left: width / 2 - markerOffsetX,
        };

        return (
            <Icon
                name="map-marker"
                type="material-community"
                color="#FF3380"
                size={42}
                containerStyle={stylePutMarker}
                onLayout={(e) => {
                    const dx = e.nativeEvent.layout.width / 2;
                    const dy = e.nativeEvent.layout.height;
                    if (markerOffsetX !== dx || markerOffsetY !== dy) {
                        this.setState({ markerOffsetX: dx, markerOffsetY: dy });
                    }
                }}
            />
        );
    }

    renderMarkerIsSelectedButtons() {
        const { navigate } = this.props.navigation;
        let leftPress;
        let middlePress;
        let rightPress;
        let rightPressIn;
        let rightLongPress;

            
            //console.log('putMarkerVisible ON');
            let leftTitle = 'CANCEL';
            let leftStyle = styles.cancelPutMarkerBtn;
            leftPress = () => this.showPutMarker(false);

            let middleTitle = 'INFO';
            let middleStyle = styles.getIssueInformation;

            middlePress = () => {
                navigate('IssueReport', {fromMap: true});
            };

            let rightTitle = 'MOVE ISSUE';
            let rightStyle = null;
                rightStyle = styles.placePutMarkerBtnYesPermission;
                rightPressIn = () => Alert.alert(
                        'Move Issue',
                        'Moving an issue can not be reversed.  Are you sure you want to continue?',
                    [
                    {text: 'Cancel', onPress: () => this.showPutMarker(false)},
                    {text: 'OK', onPress: () => {
                    this.Map.getMapCenterCoordinates().then((result) => {
                    const { longitude, latitude } = result;
                    this.props.setIssueCoordinates(latitude, longitude);
                    this.props.submitIssueEdits();
                    setTimeout(() => this.showPutMarker(false), 500);
                    },
                    )
                    }
                    },
                    ],
                    { cancelable: false },

                    );
            //} else {
            //    rightStyle = styles.placePutMarkerBtnNoPermission;
             //   rightPressIn = () => { Alert.alert("You may only move issues that you submitted") };
            //}
            return (
                <View style={styles.bottomMenu} >
                <Button
                    ref={(c) => { this.TheView = c; }}
                    containerStyle={leftStyle}
                    titleStyle={styles.buttonText}
                    onPress={leftPress}
                    title={leftTitle}
                />
                <Button 
                    containerStyle={middleStyle}
                    titleStyle={styles.buttonText}
                    onPress={middlePress}
                    title={middleTitle}
                />
                <Button
                    containerStyle={rightStyle}
                    titleStyle={styles.buttonText}
                    onPress={rightPress}
                    onPressIn={rightPressIn}
                    onLongPress={rightLongPress}
                    title={rightTitle}
                />
            </View>
            );
    }

    renderButtons() {
        const { navigate } = this.props.navigation;

        let leftPress;
        let leftTitle;
        let leftStyle;
        let rightPress;
        let rightStyle;
        let rightTitle;
        let rightPressIn;
        let rightLongPress;

        if (this.state.markerIsSelected) {
            // update marker coordinate
            return (this.renderMarkerIsSelectedButtons());
        } else if (this.state.putMarkerVisible) {

            //console.log('putMarkerVisible ON');
            leftTitle = 'CANCEL';
            leftStyle = styles.cancelPutMarkerBtn;
            leftPress = () => this.showPutMarker(false);
            rightTitle = 'REPORT ISSUE';
            rightStyle = styles.placePutMarkerBtnYesPermission;
            rightPressIn = () => {
                this.Map.getMapCenterCoordinates().then((result) => {
                    const { longitude, latitude, isOutOfBounds } = result;
                    if ( !isOutOfBounds ) {
                        this.props.clearIssueForm();
                        this.props.setIssuePark(this.props.park);
                        console.log('the center', result);
                        this.props.setIssueCoordinates(latitude, longitude);
                        Platform.OS === 'ios' ? navigate('IssueForm') : this.requestGalleryPermission()
                        setTimeout(() => this.showPutMarker(false), 500);
                    } else {
                        Alert.alert(
                            'Out of Bounds',
                            'Please select a location within the map',
                            [
                                { text: 'OK' },
                            ],
                            { cancelable: false }
                        )
                    }
                });
            };
            rightPress = undefined;
            rightLongPress = undefined;
        } else {
            leftTitle = 'DROP PIN';
            leftStyle = styles.placePutMarkerBtnYesPermission;
            leftPress = () => this.showPutMarker(!this.state.showPutMarker);

            //console.log(leftStyle);
            rightTitle = 'USE GPS';
            rightStyle = styles.reportIssueBtn;
            rightPress = () => {
                // AsyncStorage.clear();
                const { longitude, latitude } = this.Map.getCoordinates();
                this.props.clearIssueForm();
                this.props.setIssuePark(this.props.park);
                this.props.setIssueCoordinates(latitude, longitude);
                Platform.OS === 'ios' ? navigate('IssueForm') : this.requestGalleryPermission()
            };
            rightLongPress = () => this.showPutMarker(true);
            rightPressIn = undefined;
        }
        return (
            <View style={styles.bottomMenu} >
                <Button
                    ref={(c) => { this.TheView = c; }}
                    containerStyle={leftStyle}
                    titleStyle={styles.buttonText}
                    onPress={leftPress}
                    title={leftTitle}
                />
                <Button
                    containerStyle={rightStyle}
                    titleStyle={styles.buttonText}
                    onPress={rightPress}
                    onPressIn={rightPressIn}
                    onLongPress={rightLongPress}
                    title={rightTitle}
                />
            </View>
        );
    }

    setModalVisible(visible) {
        if (visible === undefined) {
            visible = false;
        }
        this.setState({modalVisible: visible });
      }


    async requestGalleryPermission() {
        const chckGalleryPermission = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        const { navigate } = this.props.navigation
        if (chckGalleryPermission === PermissionsAndroid.RESULTS.GRANTED) {
            // alert("You've access for the location");
            this.requestCameraPermission();
        } else {
            try {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    {
                        'title': 'We need your permission to access your photos',
                        'message': 'In order to submit photos of issues, we need permission' +
                        'to access your gallery. The only photos that anyone will see are' +
                        'the ones you submit in your reports. Is this okay?'
                    }
                )
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    // alert("You've access for the location")
                    // navigate('IssueForm')
                    this.requestCameraPermission();
                } else {
                    alert("You don't have access for the gallery");
                }
            } catch (err) {
                alert(err)
            }
        }
    }

    async requestCameraPermission() {
        const chckCameraPermission = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        const { navigate } = this.props.navigation
        if (chckCameraPermission === PermissionsAndroid.RESULTS.GRANTED) {
            // alert("You've access for the location");
            navigate('IssueForm')
        } else {
            try {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        'title': 'We need your permission to access your camera',
                        'message': 'In order to submit photos of issues, we need permission' +
                        'to access your camera. The only photos that anyone will see are' +
                        'the ones you submit in your reports. Is this okay?'
                    }
                )
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    // alert("You've access for the location")
                    navigate('IssueForm')
                } else {
                    alert("You don't have access for the camera");
                }
            } catch (err) {
                alert(err)
            }
        }
    }

    onIssueFiltered = (index) => {
        const issuesToDisplay = this.state.issuesToDisplay;
        issuesToDisplay[index] = !issuesToDisplay[index];

        this.setState({
            issuesToDisplay,
        });
    }

    changeDate(date, isStart) {
        if (isStart == true) {
            this.setState({startDate: date});
        }
        else {
            this.setState({endDate: date});
        }
    }

    //TO-DO
    // Break modal elements into it's own file
    //add mini-modals and/or dropdown menus
    renderModal() {
        return(
            <Modal
                animationType="slide"
                transparent={false}
                visible={this.state.modalVisible}
                onRequestClose={() => {
                    this.setModalVisible(false)
                }}
            >
                <FilterScreen
                    issueTypes={this.props.issueTypes}
                    changeDate={this.changeDate}
                    endDate={this.state.endDate}
                    startDate={this.state.startDate}
                    markerIcons={this.props.markerIcons}
                    onIssueFiltered={this.onIssueFiltered}
                    setModalVisible={this.setModalVisible}
                    modalVisible={this.state.modalVisible}
                    issuesToDisplay={this.state.issuesToDisplay}
                />
            </Modal>
        );      
    }



    render() {
        const { navigate } = this.props.navigation;

        // this.printReports();
        return (
            <View style={styles.container}>
                {this.renderModal()}
                {this.renderMap()}
                {this.state.putMarkerVisible && this.renderPutMarker()}
                {this.renderButtons()}
            </View>
        );
    }
}

Map.propTypes = {
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
        dispatch: PropTypes.func,
    }).isRequired,
    issues: PropTypes.arrayOf(PropTypes.shape({
        issueType: PropTypes.string.isRequired,
    })).isRequired,
    issueForm: PropTypes.object.isRequired,
    patrolReports: PropTypes.array.isRequired,
    setIssueCoordinates: PropTypes.func.isRequired,
    setIssuePark: PropTypes.func.isRequired,
    fillIssueForm: PropTypes.func.isRequired,
    clearIssueForm: PropTypes.func.isRequired,
    submitIssueEdits: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
    ...state.session,
    issues: state.reports,
    patrolReports: state.patrolReports,
    issueForm: state.issueForm,
});

const mapDispatchToProps = {
    fetchIssueReports,
    setIssueCoordinates,
    setIssuePark,
    fillIssueForm,
    clearIssueForm,
    submitIssueEdits,
};

const MapScreen = connect(
    mapStateToProps,
    mapDispatchToProps,
)(Map);

export default MapScreen;

