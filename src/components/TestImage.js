const TestImage = () => {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Test Image</h2>
        <img
          src="/placeholder.svg"
          alt="Placeholder"
          style={{ width: "200px", height: "200px", border: "1px solid #ccc" }}
          onError={(e) => {
            console.error("Placeholder image failed to load")
            e.target.onerror = null
            e.target.src = "https://via.placeholder.com/200"
          }}
        />
      </div>
    )
  }
  
  export default TestImage
  
  