import { StyleSheet, Dimensions } from 'react-native';
import variables from '../../../styles/variables';

const mapButton = {
  backgroundColor: '#627518',
  borderWidth: 1,
  borderColor: '#ffffff',
  alignItems: 'stretch',
  flex: 1,
  paddingTop: 13,
  paddingBottom: 13,
  margin: 10,
  marginRight: 16,
  marginLeft: 16,
};

const styles = StyleSheet.create({
  customHeader: {
    flex: 1,
    top: 40,
    marginLeft: 10,
    position: 'relative',
    fontSize: 21,
    fontWeight: 'bold',
    color: 'white',
    width: Dimensions.get('window').width * 0.75
  },
  buttonText: {
    textAlign: 'center',
    color: '#ffffff',
    fontFamily: 'JosefinSans-Light',
  },
  container: {
    flex: 1,
    alignItems: 'stretch',
    backgroundColor: 'rgba(52,52,52,1)',
  },
  drawer: {
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  main: {
    paddingLeft: 3,
  },
  map: {
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
  mapButton,
  bottomMenu: {
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    flexDirection: 'row',
    backgroundColor: 'rgba(52,52,52,0)',
    bottom: 5,
    position: 'absolute',
  },
  topMenu: {
    backgroundColor: 'rgba(52,52,52,0)',
    flex: 1,
    flexDirection: 'row',
    direction: 'rtl',
    //marginStart: 5,
    //bottom: 100,
    //right: 50,
    //position: 'absolute',
  },
  modalContainer: {
    paddingTop: 20,
    flex: 1,
  },
  parkNavMenu: {
    color: '#ffffff',
    backgroundColor: 'rgba(52,52,52,0.5)',
  },
  filterIssuesBtn: {
    ...mapButton,
    backgroundColor: 'blue',
    top: 90,
  },
  patrolReportBtn: {
    ...mapButton,
    backgroundColor: variables.backgroundGreen,
    marginRight: 8,
  },
  pickerBar: {
    flex: 1,
    flexDirection: 'row',
  },
  relocate: {
    alignItems: 'flex-end',
  },
  reportIssueBtn: {
    ...mapButton,
    backgroundColor: variables.darkOrange6,
    marginLeft: 8,
  },
  scrollView: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  top: {
    flex: 1,
    flexDirection: 'column',
  },
  cancelPutMarkerBtn: {
    ...mapButton,
    backgroundColor: '#d8290a',
    marginRight: 8,
  },
  placePutMarkerBtnYesPermission: {
    ...mapButton,
    backgroundColor: variables.darkOrange1,
    marginLeft: 8,
  },
  placePutMarkerBtnNoPermission: {
    ...mapButton,
    backgroundColor: '#D6BF9D',
    marginLeft: 8,
  },
  getIssueInformation: {
    ...mapButton,
    backgroundColor: 'green',
    padding:4,
  },

});

export default styles;