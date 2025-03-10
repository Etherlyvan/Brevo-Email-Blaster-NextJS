# arkavidia_script.py

import os
import zipfile
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_percentage_error
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# Set random seed for reproducibility
np.random.seed(42)
tf.random.set_seed(42)

# Check GPU availability
print("GPU Available:", tf.config.list_physical_devices('GPU'))

# Download and setup data
def setup_data(kaggle_json_path):
    """
    Setup Kaggle credentials and download competition data
    """
    # Create Kaggle directory if it doesn't exist
    os.makedirs(os.path.expanduser('~/.kaggle'), exist_ok=True)
    
    # Copy kaggle.json to the right location
    if os.path.exists(kaggle_json_path):
        import shutil
        shutil.copy(kaggle_json_path, os.path.expanduser('~/.kaggle/kaggle.json'))
        os.chmod(os.path.expanduser('~/.kaggle/kaggle.json'), 0o600)
        print("Kaggle credentials set up successfully")
    else:
        print(f"Kaggle JSON file not found at {kaggle_json_path}")
        print("Please provide your kaggle.json file")
        return False
    
    # Download competition data
    import subprocess
    subprocess.run(['kaggle', 'competitions', 'download', '-c', 'comodity-price-prediction-penyisihan-arkavidia-9'])
    
    # Extract the downloaded zip file
    zip_file_path = "comodity-price-prediction-penyisihan-arkavidia-9.zip"
    extract_folder_path = "./extracted_files"
    
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(extract_folder_path)
    
    print(f"File telah diekstrak ke folder: {extract_folder_path}")
    return True

def load_training_data(extract_folder_path):
    """
    Load training data from extracted files
    """
    # Path ke folder train
    train_folder = os.path.join(extract_folder_path, 'Harga Bahan Pangan/train')
    
    # Membaca semua file CSV di folder train
    train_files = [os.path.join(train_folder, file) for file in os.listdir(train_folder) if file.endswith('.csv')]
    
    # Menggabungkan semua file CSV menjadi satu DataFrame
    train_data = pd.concat([pd.read_csv(file) for file in train_files], ignore_index=True)
    
    print(f"Jumlah total baris di train: {len(train_data)}")
    print(train_data.head())
    
    return train_data, train_files

def load_test_data(extract_folder_path):
    """
    Load test data from extracted files
    """
    # Path ke folder test
    test_folder = os.path.join(extract_folder_path, 'Harga Bahan Pangan/test')
    
    # Membaca semua file CSV di folder test
    test_files = [os.path.join(test_folder, file) for file in os.listdir(test_folder) if file.endswith('.csv')]
    
    # Menggabungkan semua file CSV menjadi satu DataFrame
    test_data = pd.concat([pd.read_csv(file) for file in test_files], ignore_index=True)
    
    print(f"Jumlah total baris di test: {len(test_data)}")
    print(test_data.head())
    
    return test_data, test_files

def load_sample_submission(extract_folder_path):
    """
    Load sample submission file
    """
    sample_submission = pd.read_csv(os.path.join(extract_folder_path, 'Harga Bahan Pangan/sample_submission.csv'))
    print(sample_submission.head())
    return sample_submission

def load_google_trends_data(folder_path):
    """
    Load Google Trends data from extracted files
    """
    dataframes = []

    # Iterasi melalui setiap folder (komoditas) di dalam folder utama
    for commodity_folder in os.listdir(folder_path):
        folder_path_commodity = os.path.join(folder_path, commodity_folder)

        if os.path.isdir(folder_path_commodity):  # Pastikan hanya folder yang diproses
            for file in os.listdir(folder_path_commodity):
                if file.endswith('.csv'):  # Pastikan hanya file CSV
                    file_path = os.path.join(folder_path_commodity, file)

                    # Baca file CSV
                    df = pd.read_csv(file_path)

                    # Periksa apakah file memiliki data
                    if not df.empty:
                        # Ambil nama kolom komoditas (misalnya, "bawang")
                        commodity_column = df.columns[1]  # Kolom kedua adalah nama komoditas

                        # Ubah nama kolom komoditas menjadi 'value' untuk mempermudah pivot
                        df = df.rename(columns={commodity_column: 'value'})

                        # Tambahkan kolom 'commodity' dan 'province'
                        df['commodity'] = commodity_column  # Nama kolom kedua adalah nama komoditas
                        df['province'] = os.path.splitext(file)[0]  # Nama file tanpa ekstensi

                        # Tambahkan ke list
                        dataframes.append(df)
                    else:
                        print(f"File kosong: {file_path}")

    # Gabungkan semua DataFrame
    if dataframes:  # Pastikan ada data sebelum melakukan concat
        google_trends_data = pd.concat(dataframes, ignore_index=True)

        # Pivot data sehingga setiap komoditas menjadi kolom
        google_trends_data = google_trends_data.pivot_table(
            index=['Date', 'province'],  # Baris berdasarkan tanggal dan provinsi
            columns='commodity',         # Kolom berdasarkan komoditas
            values='value',              # Nilai dari kolom 'value'
            aggfunc='mean'               # Fungsi agregasi jika ada duplikasi
        ).reset_index()
    else:
        google_trends_data = pd.DataFrame()  # Kembalikan DataFrame kosong jika tidak ada data

    return google_trends_data

def load_global_commodity_price(folder_path):
    """
    Load global commodity price data from extracted files
    """
    dataframes = []

    # Iterasi melalui setiap file CSV di dalam folder
    for file in os.listdir(folder_path):
        if file.endswith('.csv'):  # Pastikan hanya file CSV
            file_path = os.path.join(folder_path, file)

            # Baca file CSV
            df = pd.read_csv(file_path)

            # Tambahkan ke list
            dataframes.append(df)

    # Gabungkan semua DataFrame
    global_commodity_data = pd.concat(dataframes, ignore_index=True)
    return global_commodity_data

def load_currency_data(folder_path):
    """
    Load currency data from extracted files
    """
    dataframes = []

    # Iterasi melalui setiap file CSV di dalam folder
    for file in os.listdir(folder_path):
        if file.endswith('.csv'):  # Pastikan hanya file CSV
            file_path = os.path.join(folder_path, file)

            # Baca file CSV
            df = pd.read_csv(file_path)

            # Tambahkan ke list
            dataframes.append(df)

    # Gabungkan semua DataFrame
    currency_data = pd.concat(dataframes, ignore_index=True)
    return currency_data

# Custom MAPE loss function for Keras
def mape_loss(y_true, y_pred):
    """Custom MAPE loss function for Keras"""
    return tf.reduce_mean(tf.abs((y_true - y_pred) / (y_true + tf.keras.backend.epsilon())))

# Custom MAPE metric for Keras
def mape_metric(y_true, y_pred):
    """Custom MAPE metric for Keras"""
    return tf.reduce_mean(tf.abs((y_true - y_pred) / (y_true + tf.keras.backend.epsilon()))) * 100

# Function to evaluate model using MAPE
def evaluate_model_mape(y_true, y_pred):
    """Evaluate model using MAPE"""
    return mean_absolute_percentage_error(y_true, y_pred) * 100

# Function to add date features
def add_date_features(df):
    """Add date-based features to the dataframe"""
    df = df.copy()
    df['day_of_week'] = df['Date'].dt.dayofweek
    df['day_of_month'] = df['Date'].dt.day
    df['month'] = df['Date'].dt.month
    df['quarter'] = df['Date'].dt.quarter
    df['year'] = df['Date'].dt.year
    # Add sinusoidal features for cyclical nature of time
    df['sin_day'] = np.sin(2 * np.pi * df['day_of_month']/31)
    df['cos_day'] = np.cos(2 * np.pi * df['day_of_month']/31)
    df['sin_month'] = np.sin(2 * np.pi * df['month']/12)
    df['cos_month'] = np.cos(2 * np.pi * df['month']/12)
    # Add week of year feature
    df['week_of_year'] = df['Date'].dt.isocalendar().week
    # Add is_weekend feature
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    return df

# Function to create sequences for LSTM
def create_sequences(data, target, seq_length):
    """Create sequence data for LSTM model"""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(target[i + seq_length])
    return np.array(X), np.array(y)

# Enhanced function to prepare data for a specific commodity and province
def prepare_data_for_commodity_province(commodity, province, commodity_to_dataset, global_commodity_data=None, google_trends_data=None, currency_data=None, seq_length=60):
    """Prepare data for a specific commodity and province with additional features"""
    # Get commodity dataset
    commodity_df = commodity_to_dataset[commodity]

    # Extract province data and reshape
    province_data = commodity_df[['Date', province]].copy()
    province_data.columns = ['Date', 'price']

    # Add date features
    province_data = add_date_features(province_data)

    # Merge with currency data if available
    if currency_data is not None:
        currency_features = currency_data[['Date', 'Close']].rename(columns={'Close': 'exchange_rate'})
        province_data = pd.merge(province_data, currency_features, on='Date', how='left')

    # Merge with global commodity data if available
    if global_commodity_data is not None and commodity in global_commodity_data:
        global_commodity_features = global_commodity_data[commodity][['Date', 'Price']].rename(columns={'Price': f'global_{commodity}_price'})
        province_data = pd.merge(province_data, global_commodity_features, on='Date', how='left')

    # Merge with Google Trends data if available
    if google_trends_data is not None and commodity in google_trends_data:
        trends_features = google_trends_data[commodity][['Date', 'Interest']].rename(columns={'Interest': f'{commodity}_interest'})
        province_data = pd.merge(province_data, trends_features, on='Date', how='left')

    # Fill missing values
    province_data = province_data.ffill().bfill()

    # Extract features and target
    target = province_data['price'].values
    features = province_data.drop(['Date', 'price'], axis=1).values

    # Scale the data
    feature_scaler = MinMaxScaler()
    target_scaler = MinMaxScaler()

    scaled_features = feature_scaler.fit_transform(features)
    scaled_target = target_scaler.fit_transform(target.reshape(-1, 1)).flatten()

    # Create sequences
    X, y = create_sequences(scaled_features, scaled_target, seq_length)

    # Split into training and testing sets (80-20 split)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    return X_train, X_test, y_train, y_test, feature_scaler, target_scaler

def build_lstm_model(input_shape):
    """Build LSTM model with MAPE metric"""
    model = Sequential()
    model.add(LSTM(100, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    model.add(LSTM(50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(25, activation='relu'))
    model.add(Dense(1))

    # Compile with both MSE and MAPE metrics
    model.compile(
        optimizer='adam',
        loss='mse',  # Keep MSE as primary loss for stability
        metrics=['mae', mape_metric]  # Track MAE and MAPE
    )
    return model

def select_best_features(X_train, y_train, feature_names):
    """Select the most important features using correlation analysis"""
    # Reshape X_train for correlation analysis
    X_flat = X_train.reshape(X_train.shape[0], X_train.shape[1] * X_train.shape[2])

    # Calculate correlation with target
    correlations = []
    for i in range(X_flat.shape[1]):
        corr = np.corrcoef(X_flat[:, i], y_train)[0, 1]
        if not np.isnan(corr):
            correlations.append((i, abs(corr)))

    # Sort by correlation strength
    sorted_correlations = sorted(correlations, key=lambda x: x[1], reverse=True)

    # Get top features (50% of features or at least 5)
    num_features = max(5, int(len(sorted_correlations) * 0.5))
    top_indices = [idx for idx, _ in sorted_correlations[:num_features]]

    # Get feature names
    selected_features = []
    for idx in top_indices:
        feature_idx = idx % len(feature_names)
        selected_features.append(feature_names[feature_idx])

    print(f"Selected {len(selected_features)} features: {list(set(selected_features))}")
    return top_indices

def calculate_overall_mape(validation_results):
    """Calculate overall MAPE across all models"""
    all_true = []
    all_pred = []

    for key, result in validation_results.items():
        all_true.extend(result['y_test'])
        all_pred.extend(result['y_pred'])

    overall_mape = evaluate_model_mape(np.array(all_true), np.array(all_pred))
    print(f"Overall validation MAPE: {overall_mape:.2f}%")
    return overall_mape

def generate_predictions(models, unique_commodities, provinces, commodity_to_dataset, global_commodity_data, google_trends_data, currency_data, days_to_predict=30):
    """Generate predictions for future dates"""
    predictions = {}

    for commodity in unique_commodities:
        commodity_predictions = {}

        for province in provinces:
            key = f"{commodity}/{province}"
            if key not in models:
                continue

            try:
                # Get the last sequence from training data
                X_train, X_test, y_train, y_test, feature_scaler, target_scaler = prepare_data_for_commodity_province(
                    commodity, province, commodity_to_dataset, global_commodity_data, google_trends_data, currency_data, seq_length=60)

                # Get the latest data for prediction
                latest_data = X_test[-1:] if len(X_test) > 0 else X_train[-1:]

                # Get latest date from the dataset
                latest_date = commodity_to_dataset[commodity]['Date'].max()

                # Generate future predictions
                future_dates = []
                future_prices = []
                current_data = latest_data.copy()

                for i in range(days_to_predict):
                    # Make prediction
                    pred = models[key].predict(current_data)[0][0]

                    # Convert prediction back to original scale
                    pred_original = target_scaler.inverse_transform([[pred]])[0][0]

                    # Calculate next date
                    next_date = latest_date + timedelta(days=i+1)

                    # Store prediction
                    future_dates.append(next_date)
                    future_prices.append(pred_original)

                    # Update sequence for next prediction (this is simplified)
                    # In a real application, you would need to update all features accordingly
                    current_data = np.roll(current_data, -1, axis=1)
                    current_data[0, -1, 0] = pred

                # Store predictions
                commodity_predictions[province] = pd.DataFrame({
                    'Date': future_dates,
                    'Price': future_prices
                })

            except Exception as e:
                print(f"Error generating predictions for {key}: {e}")

        predictions[commodity] = commodity_predictions

    return predictions

def visualize_results(commodity, province, validation_results):
    """Visualize actual vs predicted prices for a commodity and province"""
    if f"{commodity}/{province}" not in validation_results:
        print(f"No results available for {commodity} in {province}")
        return

    result = validation_results[f"{commodity}/{province}"]

    plt.figure(figsize=(12, 6))
    plt.plot(result['y_test'], label='Actual')
    plt.plot(result['y_pred'], label='Predicted')
    plt.title(f"{commodity} Prices in {province} (MAPE: {result['mape']:.2f}%)")
    plt.xlabel('Days')
    plt.ylabel('Price')
    plt.legend()
    plt.grid(True)
    plt.show()

def save_predictions_for_submission(predictions, output_dir='predictions'):
    """Save predictions to CSV files for competition submission"""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    for commodity in predictions:
        for province in predictions[commodity]:
            # Create filename
            filename = f"{output_dir}/{commodity}_{province}_predictions.csv"

            # Save to CSV
            predictions[commodity][province].to_csv(filename, index=False)
            print(f"Saved predictions to {filename}")

    print("All predictions saved successfully")

def create_submission_file(predictions, sample_submission, output_file='submission.csv'):
    """Create a submission file in the required format"""
    submission_df = sample_submission.copy()
    
    # Extract commodity, province, and date from the id column
    submission_df['commodity'] = submission_df['id'].apply(lambda x: x.split('/')[0])
    submission_df['province'] = submission_df['id'].apply(lambda x: x.split('/')[1])
    submission_df['date'] = pd.to_datetime(submission_df['id'].apply(lambda x: x.split('/')[2]))
    
    # Fill in predictions
    for idx, row in submission_df.iterrows():
        try:
            commodity = row['commodity']
            province = row['province']
            target_date = row['date']
            
            # Find the prediction for this commodity/province/date
            if commodity in predictions and province in predictions[commodity]:
                pred_df = predictions[commodity][province]
                # Find the closest date
                closest_date_idx = (pred_df['Date'] - target_date).abs().idxmin()
                price = pred_df.loc[closest_date_idx, 'Price']
                submission_df.at[idx, 'price'] = price
            else:
                print(f"No prediction found for {commodity}/{province}")
        except Exception as e:
            print(f"Error filling prediction for {row['id']}: {e}")
    
    # Save to CSV
    submission_df[['id', 'price']].to_csv(output_file, index=False)
    print(f"Submission file saved to {output_file}")
    
    return submission_df

def main(kaggle_json_path):
    """Main function to run the entire process"""
    # Setup data
    if not setup_data(kaggle_json_path):
        return
    
    extract_folder_path = "./extracted_files"
    
    # Load all datasets
    train_data, train_files = load_training_data(extract_folder_path)
    test_data, test_files = load_test_data(extract_folder_path)
    sample_submission = load_sample_submission(extract_folder_path)
    
    # Load additional datasets
    google_trends_folder = os.path.join(extract_folder_path, 'Google Trend')
    google_trends_data = load_google_trends_data(google_trends_folder)
    print("Dataset Google Trends:")
    print(google_trends_data.head())
    
    global_commodity_folder = os.path.join(extract_folder_path, 'Global Commodity Price')
    global_commodity_data = load_global_commodity_price(global_commodity_folder)
    print("\nDataset Global Commodity Price:")
    print(global_commodity_data.head())
    
    currency_folder = os.path.join(extract_folder_path, 'Mata Uang')
    currency_data = load_currency_data(currency_folder)
    print("\nDataset Mata Uang:")
    print(currency_data.head())
    
    # Process dates in all datasets
    train_data['Date'] = pd.to_datetime(train_data['Date'])
    test_data['Date'] = pd.to_datetime(test_data['Date'])
    google_trends_data['Date'] = pd.to_datetime(google_trends_data['Date'])
    global_commodity_data['Date'] = pd.to_datetime(global_commodity_data['Date'])
    currency_data['Date'] = pd.to_datetime(currency_data['Date'])
    
    # Extract commodities from training files
    train_file_names = [os.path.basename(file) for file in train_files]
    commodities = [file.split('.')[0] for file in train_file_names]
    unique_commodities = list(set(commodities))
    print(f"Unique commodities: {unique_commodities}")
    
    # Create commodity-to-dataset mapping
    commodity_to_dataset = {}
    for file in train_files:
        commodity = os.path.basename(file).split('.')[0]
        df = pd.read_csv(file)
        df['Date'] = pd.to_datetime(df['Date'])
        commodity_to_dataset[commodity] = df
    
    # Extract submission structure
    sample_submission['commodity'] = sample_submission['id'].apply(lambda x: x.split('/')[0])
    sample_submission['province'] = sample_submission['id'].apply(lambda x: x.split('/')[1])
    sample_submission['date'] = pd.to_datetime(sample_submission['id'].apply(lambda x: x.split('/')[2]))
    
    # Get list of provinces
    provinces = train_data.columns[1:].tolist()
    
    # Dictionary to store models
    models = {}
    validation_results = {}
    
    # Train a model for each commodity and province
    for commodity in unique_commodities:
        for province in provinces:
            try:
                print(f"Training model for {commodity} in {province}")
                
                # Prepare data
                X_train, X_test, y_train, y_test, feature_scaler, target_scaler = prepare_data_for_commodity_province(
                    commodity, province, commodity_to_dataset, global_commodity_data, google_trends_data, currency_data, seq_length=60)
                
                # Get feature names for feature selection
                commodity_df = commodity_to_dataset[commodity]
                province_data = commodity_df[['Date', province]].copy()
                province_data = add_date_features(province_data)
                feature_names = province_data.columns.drop(['Date', province]).tolist()
                
                # Feature selection (optional)
                # top_indices = select_best_features(X_train, y_train, feature_names)
                
                # Build and train model
                model = build_lstm_model(input_shape=(X_train.shape[1], X_train.shape[2]))
                
                # Add early stopping
                early_stopping = EarlyStopping(
                    monitor='val_mape_metric',
                    patience=10,
                    mode='min',
                    restore_best_weights=True
                )
                
                # Train model
                history = model.fit(
                    X_train, y_train,
                    epochs=300,
                    batch_size=32,
                    validation_split=0.2,
                    callbacks=[early_stopping],
                    verbose=0
                )
                
                # Evaluate model
                y_pred = model.predict(X_test).flatten()
                
                # Inverse transform the predictions and actual values
                y_test_inv = target_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
                y_pred_inv = target_scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()
                
                # Calculate MAPE
                mape_score = evaluate_model_mape(y_test_inv, y_pred_inv)
                print(f"    MAPE for {commodity}/{province}: {mape_score:.2f}%")
                
                # Store model and results
                models[f"{commodity}/{province}"] = model
                validation_results[f"{commodity}/{province}"] = {
                    'mape': mape_score,
                    'y_test': y_test_inv,
                    'y_pred': y_pred_inv
                }
                
            except Exception as e:
                print(f"Error training model for {commodity}/{province}: {e}")
    
    # Calculate overall MAPE
    overall_mape = calculate_overall_mape(validation_results)
    
    # Generate predictions
    future_predictions = generate_predictions(
        models, unique_commodities, provinces, commodity_to_dataset, 
        global_commodity_data, google_trends_data, currency_data, days_to_predict=30
    )
    
    # Save predictions
    save_predictions_for_submission(future_predictions)
    
    # Create submission file
    submission = create_submission_file(future_predictions, sample_submission, 'final_submission.csv')
    
    # Visualize some results (uncomment to use)
    # for commodity in unique_commodities[:1]:
    #     for province in provinces[:2]:
    #         visualize_results(commodity, province, validation_results)
    
    print("Process completed successfully!")

if __name__ == "__main__":
    # Path to your kaggle.json file
    kaggle_json_path = "kaggle.json"  # Update this path to your kaggle.json file location
    main(kaggle_json_path)