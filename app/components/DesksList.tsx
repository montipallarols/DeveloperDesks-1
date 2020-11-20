import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { usePaginatedQuery } from "react-query";
import { useNavigation } from "@react-navigation/native";

import * as Location from "expo-location";
import getDistance from "geolib/es/getDistance";

import { fetchDesksList, DesksListResult, DeskResult } from "app/lib/api";
import { Pill } from "app/ui";
import { LocationObject } from "expo-location";

export function DesksList() {
  const [filter, setFilter] = useState(0);

  const [location, setLocation] = useState<LocationObject>({
    coords: {
      accuracy: 0,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: -1,
      latitude: 0,
      longitude: 0,
      speed: 0,
    },
    timestamp: 0,
  });
  const [errorMsg, setErrorMsg] = useState<
    "Permission to access location was denied" | null
  >(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      console.log(
        "what is location ",
        location.coords.latitude,
        location.coords.longitude
      );
    })();
  }, [filter]);

  let text = "Waiting..";
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  const {
    resolvedData: list,
    isFetching,
    refetch,
    status,
    error,
  } = usePaginatedQuery<DesksListResult>({
    queryKey: ["desks_list", filter],
    async queryFn(key: string, filter: number) {
      return await fetchDesksList();
    },
  });

  if (error) {
    Alert.alert(`${error}`);
  }

  let sortedList = list ? [...list.results] : undefined;
  if (filter === 0) {
    sortedList?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (filter === 2 && location) {
    sortedList?.sort(
      (a, b) =>
        getDistance(
          { latitude: a.latitude, longitude: a.longitude },
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        ) -
        getDistance(
          { latitude: b.latitude, longitude: b.longitude },
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        )
    );
    console.log("sorted list is now ", sortedList);
  }
  console.log("what is filter", filter);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        <View style={{ marginRight: 8 }}>
          <Pill
            text="Newest"
            selected={filter === 0}
            onPress={() => setFilter(0)}
          />
        </View>
        <View style={{ marginRight: 8 }}>
          <Pill
            text="Trending"
            selected={filter === 1}
            onPress={() => setFilter(1)}
          />
        </View>
        <View style={{ marginRight: 8 }}>
          <Pill
            text="Near me"
            selected={filter === 2}
            onPress={() => setFilter(2)}
          />
        </View>
      </View>
      <FlatList
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        data={sortedList}
        keyExtractor={(desk) => `${desk.id}`}
        renderItem={({ item: desk }) => <DeskItem desk={desk} />}
      />
    </View>
  );
}

function DeskItem({ desk }: { desk: DeskResult }) {
  const navigation = useNavigation();

  const { width } = Dimensions.get("window");
  const height = width * (2 / 3);

  return (
    <Pressable
      style={styles.deskItemContainer}
      onPress={() => {
        navigation.navigate("Desk", { deskId: desk.id });
      }}
    >
      <Image source={{ uri: desk.uri }} style={{ width, height }} />
      <View style={{ marginHorizontal: 16, marginTop: 8 }}>
        <Text>
          <Text
            style={{
              fontWeight: "bold",
              fontFamily: "RobotoSlab_800ExtraBold",
            }}
          >
            {desk.developer.name}
          </Text>{" "}
          (<Text>{desk.developer.email}</Text>)
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    marginHorizontal: 16 - 4,
    marginBottom: 12,
    flexDirection: "row",
  },
  deskItemContainer: {
    marginBottom: 32,
  },
});
