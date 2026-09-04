async function testLiveVercel() {
  const res = await fetch("https://cloop-sable.vercel.app/api/shipping/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromProvince: "Hà Nội",
      toProvince: "Xã Hưng Lĩnh, Huyện Hưng Nguyên, Nghệ An",
      toDistrictId: 1947,
      toWardCode: "291806",
      weight: 500,
      isRental: true
    })
  });
  console.log("Live Vercel Status:", res.status);
  const data = await res.json();
  console.log("Live Vercel Response:", JSON.stringify(data, null, 2));
}

testLiveVercel().finally(() => process.exit(0));
