import React, { useCallback, useState } from "react";
import {
  List,
  SimpleList,
  Datagrid,
  DateField,
  TextField,
  BooleanField,
  FunctionField,
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  ImageField,
  ImageInput,
  BooleanInput,
  Filter,
  SearchInput,
  useRedirect,
  useNotify,
  FormDataConsumer,
  AutocompleteInput,
  ReferenceInput,
  useMutation,
} from "react-admin";

import { useSession } from "next-auth/client";
import {
  Typography,
  makeStyles,
  useMediaQuery,
  Button,
} from "@material-ui/core";
import EditNoDeleteToolbar from "../components/EditNoDeleteToolbar";
import BackButton from "../components/BackButton";
import blueGrey from "@material-ui/core/colors/blueGrey";
import config from "@/components/config";
import sendSMS from "@/utils/sendSMS";
import buildGupshup from "@/utils/buildGupshup";
import axios from "axios";

const useStyles = makeStyles((theme) => ({
  searchBar: {
    "& > div": {
      fontSize: "1rem",
    },
  },
  smSearchBar: {
    "& > div": {
      fontSize: "1.2rem",
    },
  },
  smList: {
    margin: "1rem 4rem",
    "& > div": {
      paddingLeft: 0,
      backgroundColor: "unset",
      "&:first-child > div": {
        backgroundColor: "unset",
      },
      "&:last-child > div": {
        backgroundColor: "#FFF",
        boxShadow:
          "0px 2px 1px -1px rgb(0 0 0 / 20%), 0px 1px 1px 0px rgb(0 0 0 / 14%), 0px 1px 3px 0px rgb(0 0 0 / 12%)",
      },
    },
  },
  list: {
    margin: "0rem 2rem",
  },
  filter: {
    paddingLeft: 0,
  },
  grid: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridRowGap: "1ch",
    gridColumnGap: "1ch",
    margin: "1rem 0",
    "& > td": theme.overrides.MuiTableCell.head,
    "& > span": {
      fontSize: "1.1rem",
    },
  },
  fullWidthGrid: {
    gridTemplateColumns: "1fr",
    margin: "0 auto",
  },
  heading: {
    fontSize: "1.4rem",
    lineHeight: "0.5rem",
    fontWeight: 700,
    fontVariant: "all-small-caps",
  },
  select: {
    width: "30vw",
    alignSelf: "center",
    "& > div > div": {
      fontSize: "1.1rem",
      transform: "translate(12px 21px)",
    },
  },
  filterSelect: {
    width: "15vw",
    alignSelf: "center",
    "& > label": {
      opacity: "0.7",
      fontSize: "1.1rem",
    },
    "& > div": {
      transform: "translate(0 5px)",
    },
    " .MuiInputLabel-shrink": {
      transform: "translate(12px, 7px) scale(0.75)",
    },
  },
  textInput: {
    "& > label": {
      fontSize: "1.1rem",
    },
  },
  selectInput: {
    minWidth: "unset",
    "& > label": {
      fontSize: "1.1rem",
    },
    "& > div > div": {
      maxHeight: "1.1rem",
    },
  },
  warning: {
    margin: "0",
    padding: "0",
    paddingBottom: "1rem",
    textAlign: "center",
    width: "100%",
    fontStyle: "oblique",
  },
  fullWidth: {
    width: "100%",
  },
  grey: {
    color: blueGrey[300],
  },
}));

const getChoice = (choices, id) => {
  return choices?.find((elem) => elem.id === id);
};

const DevicesFilter = (props) => {
  const classes = useStyles();
  const isSmall = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  return (
    <Filter {...props} className={classes.filter}>
      <SearchInput
        placeholder="Tracking ID"
        source="device_tracking_key"
        className={isSmall ? classes.smSearchBar : classes.searchBar}
        alwaysOn
      />
      <SelectInput
        label="Delivery Status"
        source="delivery_status"
        className={classes.filterSelect}
        choices={config.statusChoices}
      />
    </Filter>
  );
};

/**
 * Corporate Donors List
 * @param {*} props
 */
export const CorporateDevicesList = (props) => {
  const isSmall = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const classes = useStyles();
  return (
    <List
      {...props}
      bulkActionButtons={false}
      title="Corporate Donors List"
      className={isSmall ? classes.smList : classes.list}
      sort={{ field: "id", order: "DESC" }}
      filters={<DevicesFilter />}
    >
      {isSmall ? (
        <SimpleList
          primaryText={(record) => record.name}
          tertiaryText={(record) => record.device_tracking_key}
          linkType="edit"
        />
      ) : (
        <Datagrid rowClick="edit">
          <DateField label="Date" locales="en-IN" source="created_at" />
          <TextField label="Company Name" source="device_donation_corporate.company_name" />
          <TextField label="Name" source="device_donation_corporate.poc_name" />
          <TextField label="Email" source="device_donation_corporate.poc_email" />
          <TextField label="Phone Number" source="device_donation_corporate.poc_phone_number" />
          <TextField label="Tracking ID" source="device_tracking_key" />
          <FunctionField
            label="Delivery Staus"
            render={(record) =>
              getChoice(config?.statusChoices, record.delivery_status)?.name
            }
          />
        </Datagrid>
      )}
    </List>
  );
};

export const CorporateDevicesEdit = (props) => {
  const classes = useStyles();
  const notify = useNotify();
  const redirect = useRedirect();
  const [session] = useSession();
  const [mutate] = useMutation();
  const [otpGenerate, setOtpGenerate] = useState(false);

  const fileUpload = async (file) => {
    const newfile = await new Promise(function (resolve, reject) {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (e) => reject(e)
    })

    const responseOtp = await axios({
      method: "post",
      url: `${process.env.NEXT_PUBLIC_API_URL}/fileUpload`,
      data: {file:newfile},
    });

    return responseOtp.data;
  }

  const getTemplateFromDeliveryStatus = (status) => {
    const obj = config.statusChoices.find((elem) => elem.id === status);
    return [obj?.template, obj?.templateId, obj?.variables];
  };

  const onSuccess = async (data) => {
    if (data) {
      notify(
        "ra.notification.updated",
        "info",
        { smart_count: 1 },
        props.mutationMode === "undoable"
      );
      const { delivery_status } = data;
      const [template, templateId, variables] =
        getTemplateFromDeliveryStatus(delivery_status);
      if (template && variables && session.role) {
        //get each variable (which could be a path, like "ab.cd"), and replace it with
        //the appropriate value from the data object
        let replacedVariables = variables.map((keys) =>
          //turn "ef" or "ab.cd" into ["ef"] and ["ab", "cd"] respectively
          //and then reduce that to a singular value
          keys.split(".").reduce((acc, key) => acc[key], data)
        );
        const message = buildGupshup(template, replacedVariables);
        const response = await sendSMS(message, templateId, data.device_donation_corporate?.poc_phone_number);
        if (response?.success) notify(response.success, "info");
        else if (response?.error) notify(response.error, "warning");
      }
      redirect("list", props.basePath, data.id, data);
    }
  };

  const validateForm = async (values) => {
    const errors = {};
    if (values.delivery_status && values.delivery_status == "delivered-child") {
      if (!values.otp) {
        errors.otp = "The Otp is required";
      }
    }

    return errors;
  };

  const uuidv4 = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const filtered = (raw, allowed, except = "only") => {
    return Object.keys(raw)
      .filter((key) =>
        except == "except" ? !allowed.includes(key) : allowed.includes(key)
      )
      .reduce((obj, key) => {
        obj[key] = raw[key];
        return obj;
      }, {});
  };

  const save = useCallback(
    async (values) => {
      try {
        if (values.otp) {
          const responseOtp = await axios({
            method: "POST",
            url: `${process.env.NEXT_PUBLIC_API_URL}/sendOTP`,
            data: {
              phone_number: values.device_donation_corporate?.poc_phone_number,
              otp: values.otp,
            },
          });

          const responseOtpObject = responseOtp.data;
          if (responseOtpObject.error) {
            return {
              otp: "invalid otp",
            };
          }
        }
        const verificationKey = [
          "verifier_name",
          "number_of_students",
          "photograph_url",
          "declaration",
        ];
        const recordData = filtered(values, verificationKey, "except");
        const verificationData = filtered(values, verificationKey, "only");
        
        const response = await mutate(
          {
            type: "update",
            resource: "corporate_donor_devices",
            payload: { id: values.id, data: recordData },
          },
          { returnPromise: true }
        );
        const responseObject = response.data;
        if (
          values.otp &&
          responseObject &&
          responseObject.delivery_status == "delivered-child"
        ) {
          let fileUrl = "";
          if(values.photograph_url) {
            fileUrl = await fileUpload(values.photograph_url?.rawFile);
          }
          const record = {
            ...verificationData,
            udise: session.username,
            transaction_id: uuidv4(),
            device_tracking_key_corporate: responseObject.device_tracking_key,
            photograph_url: fileUrl
          };
          const response = await mutate(
            {
              type: "create",
              resource: "device_verification_records",
              payload: { data: record },
            },
            { returnPromise: true }
          );
          setOtpGenerate(false);
        }
        onSuccess(responseObject);
      } catch (error) {
        console.log('error',error);
        if (error.body?.errors) {
          return error.body.errors;
        } else {
          return error.body;
        }
      }
    },
    [mutate]
  );

  const sendOtp = async (phone_number) => {
    const response = await axios({
      method: "GET",
      url: `${process.env.NEXT_PUBLIC_API_URL}/sendOTP?phone_number=${phone_number}`,
    });
    const responseObject = response.data;
    if (!responseObject.error) {
      setOtpGenerate(true);
    }
  };

  const InputOtp = ({ phone_number }) => {
    return (
      <TextInput
        label="OTP"
        className={classes.textInput}
        source="otp"
        disabled={!otpGenerate}
        InputProps={{
          endAdornment: (
            <Button
              variant="contained"
              color="primary"
              onClick={
                () => {
                sendOtp(phone_number);
              }}
            >
              Generate
            </Button>
          ),
        }}
      />
    );
  };

  const Title = ({ record }) => {
    return (
      <span>
        Edit Corporate Donor{" "}
        <span className={classes.grey}>#{record.device_tracking_key}</span>
      </span>
    );
  };
  return (
    <div>
      <Edit
        mutationMode={"pessimistic"}
        title={<Title />}
        {...props}
      >
        <SimpleForm
          toolbar={<EditNoDeleteToolbar />}
          validate={validateForm}
          save={save}
        >
          <BackButton history={props.history} />
          <span className={classes.heading}>Corporate Details</span>
          <div className={classes.grid}>
            <td>Company Name</td>
            <td>Name</td>
            <td>Phone Number</td>
            <TextField label="Company Name" source="device_donation_corporate.company_name" disabled variant="outlined" />
            <TextField label="Name" source="device_donation_corporate.poc_name" disabled variant="outlined" />
            <TextField label="Phone Number" source="device_donation_corporate.poc_phone_number" disabled variant="outlined" />
          </div>
          <div className={classes.grid}>
            <td>Designation</td>
            <td>Tracking ID</td>
            <td>Date</td>
            <TextField label="Designation" source="device_donation_corporate.poc_designation" disabled variant="outlined" />
            <TextField label="Tracking ID" source="device_tracking_key" disabled variant="outlined" />
            <DateField label="Date" locales="en-IN" source="created_at" />
          </div>
          <span className={classes.heading}>Update Status</span>
          <div className={`${classes.grid} ${classes.fullWidthGrid}`}>
            <SelectInput
              source="delivery_status"
              choices={config.statusChoices}
              label="Delivery Status"
              disabled={
                !(
                  session.role !== "school" ||
                  session.applicationId ===
                    process.env.NEXT_PUBLIC_FUSIONAUTH_SCHOOL_APP_ID
                )
              }
            />
            <FormDataConsumer>
              {({ formData, ...rest }) =>
                formData?.delivery_status === "delivered-child" ? (
                  <>
                    <h2 className={classes.heading}>Recipient</h2>
                    <div
                      className={
                        session.role === "school" ? classes.grid : null
                      }
                    >
                      <ReferenceInput
                        reference="school"
                        label="School"
                        source="recipient_school_id"
                        className={classes.fullWidth}
                        filterToQuery={(searchText) => ({
                          "name@_ilike": searchText,
                        })}
                      >
                        <AutocompleteInput
                          optionValue="id"
                          optionText="name"
                          disabled={session.role === "school"}
                          {...rest}
                        />
                      </ReferenceInput>
                      {session.role === "school" ? (
                        <>
                          <TextInput
                            label="Name"
                            className={classes.textInput}
                            source="recipient_name"
                          />
                          <SelectInput
                            label="Grade"
                            choices={config.gradeChoices}
                            className={classes.selectInput}
                            source="recipient_grade"
                          />
                        </>
                      ) : (
                        <></>
                      )}
                    </div>

                    <h2 className={classes.heading}>Verification</h2>
                    <div
                      className={
                        session.role === "school" ? classes.grid : null
                      }
                    >
                      <TextInput
                        label="Verifier Name"
                        className={classes.textInput}
                        source="verifier_name"
                      />
                      <ImageInput
                        label="Upload photo"
                        className={classes.textInput}
                        source="photograph_url"
                      >
                        <ImageField source="photograph_url" />
                      </ImageInput>
                      <InputOtp phone_number={formData.device_donation_corporate?.poc_phone_number} />
                      <BooleanInput
                        source="declaration"
                        label="Yes, I agree with the above declaration हां, मैं उपरोक्त घोषणा से सहमत हूं"
                        className={classes.fullWidth}
                      />
                    </div>
                  </>
                ) : (
                  <></>
                )
              }
            </FormDataConsumer>
          </div>
        </SimpleForm>
      </Edit>
    </div>
  );
};
